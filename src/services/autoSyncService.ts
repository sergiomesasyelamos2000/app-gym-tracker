import type {
  CreateCustomMealDto,
  CreateCustomProductDto,
  CreateFoodEntryDto,
  FavoriteProductResponseDto,
  RoutineLayoutRequestDto,
  RoutineRequestDto,
  RoutineResponseDto,
  RoutineSessionEntity,
  UpdateCustomMealDto,
  UpdateCustomProductDto,
  UpdateFoodEntryDto,
} from "@sergiomesasyelamos2000/shared";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import {
  addFavorite,
  addFoodEntry,
  createCustomMeal,
  createCustomProduct,
  deleteCustomMeal,
  deleteCustomProduct,
  deleteFoodEntry,
  removeFavoriteByProductCode,
  updateCustomMeal,
  updateCustomProduct,
  updateFoodEntry,
} from "../features/nutrition/services/nutritionService";
import {
  createRoutineFolder,
  deleteRoutine,
  deleteRoutineFolder,
  renameRoutineFolder,
  saveRoutine,
  saveRoutineLayout,
  saveRoutineSession,
  updateRoutineById,
  upsertRoutineSessionCaches,
} from "../features/routine/services/routineService";
import {
  folderKey,
  parseRootKey,
  useRoutineFolderStore,
} from "../store/useRoutineFolderStore";
import { useSyncStore } from "../store/useSyncStore";
import { CaughtError, getErrorMessage } from "../types";
import { NUTRITION_ID_MAPPING_KEY } from "./nutritionOfflineKeys";
import {
  PendingOperation,
  SYNC_QUEUE_KEY,
  getPendingCount,
  getPendingOperations,
  isOnline,
  removeFromSyncQueue,
} from "./syncQueue";

const MAX_RETRIES = 3;
const SYNC_INTERVAL_MS = 60000; // 1 minute
let syncIntervalId: ReturnType<typeof setTimeout> | null = null;
let isSyncing = false;

/**
 * Process all pending operations in the sync queue
 */
export async function processSyncQueue(): Promise<{
  success: number;
  failed: number;
}> {
  if (isSyncing) {
    return { success: 0, failed: 0 };
  }

  const online = await isOnline();
  if (!online) {
    return { success: 0, failed: 0 };
  }

  isSyncing = true;
  useSyncStore.getState().setSyncing(true);

  let successCount = 0;
  let failedCount = 0;

  try {
    const operations = await getPendingOperations();

    if (operations.length === 0) {
      useSyncStore.getState().setPendingOperations(0);
      return { success: 0, failed: 0 };
    }

    for (const operation of operations) {
      try {
        const success = await processOperation(operation);
        if (success) {
          await removeFromSyncQueue(operation.id);
          successCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        console.error(`[AutoSync] Error processing operation:`, error);
        failedCount++;
      }
    }

    const remaining = await getPendingCount();
    useSyncStore.getState().setPendingOperations(remaining);
    if (successCount > 0) {
      useSyncStore.getState().setLastSyncAt(new Date().toISOString());
    }
  } finally {
    isSyncing = false;
    useSyncStore.getState().setSyncing(false);
  }

  return { success: successCount, failed: failedCount };
}

/**
 * Process a single operation
 */
async function processOperation(operation: PendingOperation): Promise<boolean> {
  if (operation.retries >= MAX_RETRIES) {
    return false;
  }

  try {
    switch (operation.type) {
      case "CREATE_ROUTINE":
        await syncCreateRoutine(operation);
        return true;

      case "UPDATE_ROUTINE":
        await syncUpdateRoutine(operation);
        return true;

      case "DELETE_ROUTINE":
        await syncDeleteRoutine(operation);
        return true;

      case "CREATE_SESSION":
        await syncCreateSession(operation);
        return true;

      case "CREATE_FOLDER":
        await syncCreateFolder(operation);
        return true;

      case "RENAME_FOLDER":
        await syncRenameFolder(operation);
        return true;

      case "DELETE_FOLDER":
        await syncDeleteFolder(operation);
        return true;

      case "UPSERT_LAYOUT":
        await syncUpsertLayout(operation);
        return true;

      case "CREATE_FOOD_ENTRY":
        await syncCreateFoodEntry(operation);
        return true;

      case "UPDATE_FOOD_ENTRY":
        await syncUpdateFoodEntry(operation);
        return true;

      case "DELETE_FOOD_ENTRY":
        await syncDeleteFoodEntry(operation);
        return true;

      case "CREATE_CUSTOM_PRODUCT":
        await syncCreateCustomProduct(operation);
        return true;

      case "UPDATE_CUSTOM_PRODUCT":
        await syncUpdateCustomProduct(operation);
        return true;

      case "DELETE_CUSTOM_PRODUCT":
        await syncDeleteCustomProduct(operation);
        return true;

      case "CREATE_CUSTOM_MEAL":
        await syncCreateCustomMeal(operation);
        return true;

      case "UPDATE_CUSTOM_MEAL":
        await syncUpdateCustomMeal(operation);
        return true;

      case "DELETE_CUSTOM_MEAL":
        await syncDeleteCustomMeal(operation);
        return true;

      case "ADD_FAVORITE":
        await syncAddFavorite(operation);
        return true;

      case "REMOVE_FAVORITE":
        await syncRemoveFavorite(operation);
        return true;

      default:
        console.warn(`[AutoSync] Unknown operation type:`, operation.type);
        return false;
    }
  } catch (error: CaughtError) {
    console.error(
      `[AutoSync] Error syncing ${operation.type}:`,
      getErrorMessage(error)
    );

    // Increment retry count
    operation.retries++;

    // Update operation in queue with new retry count
    const operations = await getPendingOperations();
    const updatedOps = operations.map((op) =>
      op.id === operation.id ? operation : op
    );
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(updatedOps));

    return false;
  }
}

/**
 * Sync CREATE_ROUTINE operation
 */
async function syncCreateRoutine(operation: PendingOperation): Promise<void> {
  // Type guard: aseguramos que el payload es RoutineRequestDto
  if (operation.type !== "CREATE_ROUTINE") {
    throw new Error("Invalid operation type for syncCreateRoutine");
  }

  const routine = operation.payload as RoutineRequestDto & { id?: string };
  const localId = routine.id || "";

  // Save to backend
  const savedRoutine = await saveRoutine(routine);

  // Update local cache with server ID
  if (localId) {
    await updateLocalRoutineId(localId, savedRoutine.id);

    // Update any sessions that reference this routine
    await updateSessionRoutineIds(localId, savedRoutine.id);
  }
}

/**
 * Sync UPDATE_ROUTINE operation
 */
async function syncUpdateRoutine(operation: PendingOperation): Promise<void> {
  // Type guard: aseguramos que el payload tiene la estructura correcta
  if (operation.type !== "UPDATE_ROUTINE") {
    throw new Error("Invalid operation type for syncUpdateRoutine");
  }

  const payload = operation.payload as {
    id: string;
    routine: RoutineRequestDto;
  };
  const { id, routine } = payload;

  // If it's a local ID, we need to find the real ID first
  const realId = await getServerIdForLocalId(id);

  if (realId) {
    await updateRoutineById(realId, routine);
  } else {
    // If no mapping exists, treat as create
    await syncCreateRoutine({
      ...operation,
      type: "CREATE_ROUTINE",
      payload: { ...routine, id } as RoutineRequestDto & { id: string },
    });
  }
}

/**
 * Sync CREATE_SESSION operation
 */
async function syncCreateSession(operation: PendingOperation): Promise<void> {
  // Type guard: aseguramos que el payload tiene la estructura correcta
  if (operation.type !== "CREATE_SESSION") {
    throw new Error("Invalid operation type for syncCreateSession");
  }

  const payload = operation.payload as {
    routineId: string;
    session: Partial<RoutineSessionEntity>;
  };
  const { routineId, session } = payload;

  // If routine has local ID, map to server ID
  const realRoutineId = await getServerIdForLocalId(routineId);

  if (!realRoutineId) {
    console.warn(
      `[AutoSync] Cannot sync session - routine ${routineId} not synced yet`
    );
    throw new Error("Parent routine not synced");
  }

  const saved = await saveRoutineSession(realRoutineId, session);
  await upsertRoutineSessionCaches({
    ...saved,
    routineId: saved.routineId || realRoutineId,
  });
}

async function syncDeleteRoutine(operation: PendingOperation): Promise<void> {
  if (operation.type !== "DELETE_ROUTINE") {
    throw new Error("Invalid operation type for syncDeleteRoutine");
  }
  const { id } = operation.payload as { id: string };
  const realId = (await getServerIdForLocalId(id)) ?? id;
  if (realId.startsWith("local_")) {
    return;
  }
  await deleteRoutine(realId);
}

async function syncCreateFolder(operation: PendingOperation): Promise<void> {
  if (operation.type !== "CREATE_FOLDER") {
    throw new Error("Invalid operation type for syncCreateFolder");
  }
  const { localId, title } = operation.payload as {
    localId: string;
    title: string;
  };
  const created = await createRoutineFolder(title);
  await remapFolderId(localId, created.id);
}

async function syncRenameFolder(operation: PendingOperation): Promise<void> {
  if (operation.type !== "RENAME_FOLDER") {
    throw new Error("Invalid operation type for syncRenameFolder");
  }
  const { id, title } = operation.payload as { id: string; title: string };
  const realId = (await getFolderServerId(id)) ?? id;
  if (realId.startsWith("folder_")) {
    throw new Error("Folder not synced yet");
  }
  await renameRoutineFolder(realId, title);
}

async function syncDeleteFolder(operation: PendingOperation): Promise<void> {
  if (operation.type !== "DELETE_FOLDER") {
    throw new Error("Invalid operation type for syncDeleteFolder");
  }
  const { id } = operation.payload as { id: string };
  const realId = (await getFolderServerId(id)) ?? id;
  if (realId.startsWith("folder_")) {
    return;
  }
  await deleteRoutineFolder(realId);
}

async function syncUpsertLayout(operation: PendingOperation): Promise<void> {
  if (operation.type !== "UPSERT_LAYOUT") {
    throw new Error("Invalid operation type for syncUpsertLayout");
  }
  const layout = operation.payload as RoutineLayoutRequestDto;
  const mapped = await mapLayoutIdsToServer(layout);
  await saveRoutineLayout(mapped);
}

async function getFolderServerId(localId: string): Promise<string | null> {
  if (!localId.startsWith("folder_")) {
    return localId;
  }
  try {
    const mappingStr = await AsyncStorage.getItem("@folder_id_mapping");
    if (!mappingStr) return null;
    const mapping: Record<string, string> = JSON.parse(mappingStr);
    return mapping[localId] || null;
  } catch {
    return null;
  }
}

async function remapFolderId(localId: string, serverId: string): Promise<void> {
  try {
    const mappingStr = await AsyncStorage.getItem("@folder_id_mapping");
    const mapping: Record<string, string> = mappingStr
      ? JSON.parse(mappingStr)
      : {};
    mapping[localId] = serverId;
    await AsyncStorage.setItem("@folder_id_mapping", JSON.stringify(mapping));

    const foldersCache = await AsyncStorage.getItem("@routine_folders_cache");
    if (foldersCache) {
      const folders = JSON.parse(foldersCache) as Array<{ id: string }>;
      await AsyncStorage.setItem(
        "@routine_folders_cache",
        JSON.stringify(
          folders.map((f) => (f.id === localId ? { ...f, id: serverId } : f))
        )
      );
    }

    const store = useRoutineFolderStore.getState();
    const folders = store.folders.map((f) =>
      f.id === localId ? { ...f, id: serverId } : f
    );
    const rootOrder = store.rootOrder.map((key) => {
      const parsed = parseRootKey(key);
      if (parsed.type === "folder" && parsed.id === localId) {
        return folderKey(serverId);
      }
      return key;
    });
    const expandedFolderIds = store.expandedFolderIds.map((id) =>
      id === localId ? serverId : id
    );
    store.replaceLayout(folders, rootOrder, expandedFolderIds);

    // Remap folder ids inside pending layout ops.
    const operations = await getPendingOperations();
    const updated = operations.map((op) => {
      if (op.type !== "UPSERT_LAYOUT") return op;
      const layout = op.payload as RoutineLayoutRequestDto;
      return {
        ...op,
        payload: {
          rootOrder: layout.rootOrder.map((item) =>
            item.type === "folder" && item.id === localId
              ? { ...item, id: serverId }
              : item
          ),
          folders: layout.folders.map((folder) =>
            folder.id === localId ? { ...folder, id: serverId } : folder
          ),
        },
      };
    });
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("[AutoSync] Failed to remap folder id:", error);
  }
}

async function mapLayoutIdsToServer(
  layout: RoutineLayoutRequestDto
): Promise<RoutineLayoutRequestDto> {
  const mapFolder = async (id: string) =>
    (await getFolderServerId(id)) ?? id;
  const mapRoutine = async (id: string) =>
    (await getServerIdForLocalId(id)) ?? id;

  const folders = await Promise.all(
    layout.folders.map(async (folder) => ({
      ...folder,
      id: await mapFolder(folder.id),
      routineIds: await Promise.all(folder.routineIds.map(mapRoutine)),
    }))
  );

  const rootOrder = await Promise.all(
    layout.rootOrder.map(async (item) => ({
      ...item,
      id:
        item.type === "folder"
          ? await mapFolder(item.id)
          : await mapRoutine(item.id),
    }))
  );

  return { rootOrder, folders };
}

async function syncCreateFoodEntry(operation: PendingOperation): Promise<void> {
  if (operation.type !== "CREATE_FOOD_ENTRY") {
    throw new Error("Invalid operation type for syncCreateFoodEntry");
  }
  const entry = operation.payload as CreateFoodEntryDto & { id?: string };
  const localId = entry.id;
  const { id: _omit, ...body } = entry;
  const saved = await addFoodEntry(body);
  if (localId?.startsWith("local_")) {
    await updateNutritionLocalId(localId, saved.id);
    await rewritePendingNutritionEntityIds(localId, saved.id);
  }
}

async function syncUpdateFoodEntry(operation: PendingOperation): Promise<void> {
  if (operation.type !== "UPDATE_FOOD_ENTRY") {
    throw new Error("Invalid operation type for syncUpdateFoodEntry");
  }
  const payload = operation.payload as { id: string } & UpdateFoodEntryDto;
  const realId = (await getNutritionServerId(payload.id)) ?? payload.id;
  const { id: _omit, ...updates } = payload;
  await updateFoodEntry(realId, updates);
}

async function syncDeleteFoodEntry(operation: PendingOperation): Promise<void> {
  if (operation.type !== "DELETE_FOOD_ENTRY") {
    throw new Error("Invalid operation type for syncDeleteFoodEntry");
  }
  const { id } = operation.payload as { id: string };
  const realId = (await getNutritionServerId(id)) ?? id;
  if (realId.startsWith("local_")) {
    // Never synced — nothing to delete on server.
    return;
  }
  await deleteFoodEntry(realId);
}

async function syncCreateCustomProduct(
  operation: PendingOperation
): Promise<void> {
  if (operation.type !== "CREATE_CUSTOM_PRODUCT") {
    throw new Error("Invalid operation type for syncCreateCustomProduct");
  }
  const product = operation.payload as CreateCustomProductDto & { id?: string };
  const localId = product.id;
  const { id: _omit, ...body } = product;
  const saved = await createCustomProduct(body);
  if (localId?.startsWith("local_")) {
    await updateNutritionLocalId(localId, saved.id);
    await rewritePendingNutritionEntityIds(localId, saved.id);
  }
}

async function syncUpdateCustomProduct(
  operation: PendingOperation
): Promise<void> {
  if (operation.type !== "UPDATE_CUSTOM_PRODUCT") {
    throw new Error("Invalid operation type for syncUpdateCustomProduct");
  }
  const payload = operation.payload as { id: string } & UpdateCustomProductDto;
  const realId = (await getNutritionServerId(payload.id)) ?? payload.id;
  const { id: _omit, ...updates } = payload;
  await updateCustomProduct(realId, updates);
}

async function syncDeleteCustomProduct(
  operation: PendingOperation
): Promise<void> {
  if (operation.type !== "DELETE_CUSTOM_PRODUCT") {
    throw new Error("Invalid operation type for syncDeleteCustomProduct");
  }
  const { id } = operation.payload as { id: string };
  const realId = (await getNutritionServerId(id)) ?? id;
  if (realId.startsWith("local_")) return;
  await deleteCustomProduct(realId);
}

async function syncCreateCustomMeal(operation: PendingOperation): Promise<void> {
  if (operation.type !== "CREATE_CUSTOM_MEAL") {
    throw new Error("Invalid operation type for syncCreateCustomMeal");
  }
  const meal = operation.payload as CreateCustomMealDto & { id?: string };
  const localId = meal.id;
  const { id: _omit, ...body } = meal;
  const saved = await createCustomMeal(body);
  if (localId?.startsWith("local_")) {
    await updateNutritionLocalId(localId, saved.id);
    await rewritePendingNutritionEntityIds(localId, saved.id);
  }
}

async function syncUpdateCustomMeal(operation: PendingOperation): Promise<void> {
  if (operation.type !== "UPDATE_CUSTOM_MEAL") {
    throw new Error("Invalid operation type for syncUpdateCustomMeal");
  }
  const payload = operation.payload as { id: string } & UpdateCustomMealDto;
  const realId = (await getNutritionServerId(payload.id)) ?? payload.id;
  const { id: _omit, ...updates } = payload;
  await updateCustomMeal(realId, updates);
}

async function syncDeleteCustomMeal(operation: PendingOperation): Promise<void> {
  if (operation.type !== "DELETE_CUSTOM_MEAL") {
    throw new Error("Invalid operation type for syncDeleteCustomMeal");
  }
  const { id } = operation.payload as { id: string };
  const realId = (await getNutritionServerId(id)) ?? id;
  if (realId.startsWith("local_")) return;
  await deleteCustomMeal(realId);
}

async function syncAddFavorite(operation: PendingOperation): Promise<void> {
  if (operation.type !== "ADD_FAVORITE") {
    throw new Error("Invalid operation type for syncAddFavorite");
  }
  const favorite = operation.payload as Omit<
    FavoriteProductResponseDto,
    "id" | "createdAt"
  > & { id?: string; createdAt?: string | Date };
  const localId = favorite.id;
  const { id: _omit, createdAt: _c, ...body } = favorite;
  const saved = await addFavorite(body);
  if (localId?.startsWith("local_")) {
    await updateNutritionLocalId(localId, saved.id);
  }
}

async function syncRemoveFavorite(operation: PendingOperation): Promise<void> {
  if (operation.type !== "REMOVE_FAVORITE") {
    throw new Error("Invalid operation type for syncRemoveFavorite");
  }
  const { productCode } = operation.payload as { productCode: string };
  await removeFavoriteByProductCode(productCode);
}

async function updateNutritionLocalId(
  localId: string,
  serverId: string
): Promise<void> {
  try {
    const mappingStr = await AsyncStorage.getItem(NUTRITION_ID_MAPPING_KEY);
    const mapping: Record<string, string> = mappingStr
      ? JSON.parse(mappingStr)
      : {};
    mapping[localId] = serverId;
    await AsyncStorage.setItem(
      NUTRITION_ID_MAPPING_KEY,
      JSON.stringify(mapping)
    );
  } catch (error) {
    console.error("[AutoSync] Failed to update nutrition ID mapping:", error);
  }
}

async function getNutritionServerId(localId: string): Promise<string | null> {
  try {
    if (!localId.startsWith("local_")) {
      return localId;
    }
    const mappingStr = await AsyncStorage.getItem(NUTRITION_ID_MAPPING_KEY);
    if (!mappingStr) return null;
    const mapping: Record<string, string> = JSON.parse(mappingStr);
    return mapping[localId] || null;
  } catch (error) {
    console.error("[AutoSync] Failed to get nutrition server ID:", error);
    return null;
  }
}

async function rewritePendingNutritionEntityIds(
  localId: string,
  serverId: string
): Promise<void> {
  try {
    const operations = await getPendingOperations();
    const updated = operations.map((op) => {
      if (
        (op.type === "UPDATE_FOOD_ENTRY" ||
          op.type === "DELETE_FOOD_ENTRY" ||
          op.type === "UPDATE_CUSTOM_PRODUCT" ||
          op.type === "DELETE_CUSTOM_PRODUCT" ||
          op.type === "UPDATE_CUSTOM_MEAL" ||
          op.type === "DELETE_CUSTOM_MEAL") &&
        "id" in op.payload &&
        op.payload.id === localId
      ) {
        return {
          ...op,
          payload: { ...op.payload, id: serverId },
        };
      }
      return op;
    });
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error(
      "[AutoSync] Failed to rewrite pending nutrition entity IDs:",
      error
    );
  }
}

/**
 * Update local routine ID mapping
 */
async function updateLocalRoutineId(
  localId: string,
  serverId: string
): Promise<void> {
  try {
    const mappingStr = await AsyncStorage.getItem("@routine_id_mapping");
    const mapping: Record<string, string> = mappingStr
      ? JSON.parse(mappingStr)
      : {};

    mapping[localId] = serverId;
    await AsyncStorage.setItem("@routine_id_mapping", JSON.stringify(mapping));

    // Update local routines cache
    const routinesStr = await AsyncStorage.getItem("@local_routines");
    if (routinesStr) {
      const routines = JSON.parse(routinesStr) as RoutineResponseDto[];
      const updated = routines.map((r) =>
        r.id === localId ? { ...r, id: serverId, _isPending: false } : r
      );
      await AsyncStorage.setItem("@local_routines", JSON.stringify(updated));
    }

    // Update main routines cache (for WorkoutScreen list)
    const mainCacheStr = await AsyncStorage.getItem("@routines_cache");
    if (mainCacheStr) {
      const mainCache = JSON.parse(mainCacheStr) as RoutineResponseDto[];
      const updatedMain = mainCache.map((r) =>
        r.id === localId ? { ...r, id: serverId, _isPending: false } : r
      );
      await AsyncStorage.setItem(
        "@routines_cache",
        JSON.stringify(updatedMain)
      );
    }
  } catch (error) {
    console.error("[AutoSync] Failed to update routine ID mapping:", error);
  }
}

/**
 * Get server ID for local ID
 */
async function getServerIdForLocalId(localId: string): Promise<string | null> {
  try {
    // If it's not a local ID, return as-is
    if (!localId.startsWith("local_")) {
      return localId;
    }

    const mappingStr = await AsyncStorage.getItem("@routine_id_mapping");
    if (!mappingStr) return null;

    const mapping: Record<string, string> = JSON.parse(mappingStr);
    return mapping[localId] || null;
  } catch (error) {
    console.error("[AutoSync] Failed to get server ID:", error);
    return null;
  }
}

/**
 * Update session routine IDs in queue
 */
async function updateSessionRoutineIds(
  oldId: string,
  newId: string
): Promise<void> {
  try {
    const operations = await getPendingOperations();
    const updated = operations.map((op) => {
      if (
        op.type === "CREATE_SESSION" &&
        typeof op.payload === "object" &&
        op.payload !== null &&
        "routineId" in op.payload &&
        op.payload.routineId === oldId
      ) {
        return {
          ...op,
          payload: { ...op.payload, routineId: newId },
        };
      }
      return op;
    });

    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("[AutoSync] Failed to update session routine IDs:", error);
  }
}

/**
 * Start automatic sync (triggers on network change and periodic intervals)
 */
export function startAutoSync(): void {
  // Listen to network changes
  const unsubscribe = NetInfo.addEventListener(async (state) => {
    if (state.isConnected && state.isInternetReachable) {
      await processSyncQueue();
    }
  });

  // Periodic sync every minute
  syncIntervalId = setInterval(async () => {
    const online = await isOnline();
    if (online) {
      await processSyncQueue();
    }
  }, SYNC_INTERVAL_MS);

  // Store unsubscribe for cleanup
  (startAutoSync as any).unsubscribe = unsubscribe;
}

/**
 * Stop automatic sync
 */
export function stopAutoSync(): void {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
  }

  if ((startAutoSync as any).unsubscribe) {
    (startAutoSync as any).unsubscribe();
    (startAutoSync as any).unsubscribe = null;
  }
}

/**
 * Force immediate sync
 */
export async function forceSyncNow(): Promise<{
  success: number;
  failed: number;
}> {
  return await processSyncQueue();
}

/**
 * Check if currently syncing
 */
export function isSyncInProgress(): boolean {
  return isSyncing;
}
