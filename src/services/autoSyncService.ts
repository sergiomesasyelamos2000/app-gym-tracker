import type {
  RoutineRequestDto,
  RoutineResponseDto,
  RoutineSessionEntity,
} from "@entity-data-models/index";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import {
  saveRoutine,
  saveRoutineSession,
  updateRoutineById,
} from "../features/routine/services/routineService";
import { CaughtError, getErrorMessage } from "../types";
import {
  PendingOperation,
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

  let successCount = 0;
  let failedCount = 0;

  try {
    const operations = await getPendingOperations();

    if (operations.length === 0) {
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

    // If any routines were synced successfully, trigger a cache refresh
  } finally {
    isSyncing = false;
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

      case "CREATE_SESSION":
        await syncCreateSession(operation);
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
    await AsyncStorage.setItem("@sync_queue", JSON.stringify(updatedOps));

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

  await saveRoutineSession(realRoutineId, session);
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

    await AsyncStorage.setItem("@sync_queue", JSON.stringify(updated));
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
