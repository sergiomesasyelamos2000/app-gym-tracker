import NetInfo from "@react-native-community/netinfo";
import {
  getPendingOperations,
  removeFromSyncQueue,
  PendingOperation,
  isOnline,
} from "./syncQueue";
import {
  saveRoutine,
  updateRoutineById,
  saveRoutineSession,
} from "../features/routine/services/routineService";
import AsyncStorage from "@react-native-async-storage/async-storage";

const MAX_RETRIES = 3;
const SYNC_INTERVAL_MS = 60000; // 1 minute
let syncIntervalId: NodeJS.Timeout | null = null;
let isSyncing = false;

/**
 * Process all pending operations in the sync queue
 */
export async function processSyncQueue(): Promise<{
  success: number;
  failed: number;
}> {
  if (isSyncing) {
    console.log("[AutoSync] Already syncing, skipping...");
    return { success: 0, failed: 0 };
  }

  const online = await isOnline();
  if (!online) {
    console.log("[AutoSync] Device offline, skipping sync");
    return { success: 0, failed: 0 };
  }

  isSyncing = true;
  console.log("[AutoSync] Starting sync process...");

  let successCount = 0;
  let failedCount = 0;

  try {
    const operations = await getPendingOperations();

    if (operations.length === 0) {
      console.log("[AutoSync] No pending operations");
      return { success: 0, failed: 0 };
    }

    console.log(`[AutoSync] Processing ${operations.length} operations`);

    for (const operation of operations) {
      try {
        const success = await processOperation(operation);
        if (success) {
          await removeFromSyncQueue(operation.id);
          successCount++;
          console.log(`[AutoSync] ✅ Synced ${operation.type}:`, operation.id);
        } else {
          failedCount++;
          console.log(`[AutoSync] ❌ Failed ${operation.type}:`, operation.id);
        }
      } catch (error) {
        console.error(`[AutoSync] Error processing operation:`, error);
        failedCount++;
      }
    }

    console.log(
      `[AutoSync] Sync complete. Success: ${successCount}, Failed: ${failedCount}`
    );

    // If any routines were synced successfully, trigger a cache refresh
    if (successCount > 0) {
      console.log("[AutoSync] Sync successful, cache updated");
    }
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
    console.warn(
      `[AutoSync] Max retries reached for operation:`,
      operation.id
    );
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
  } catch (error: any) {
    console.error(`[AutoSync] Error syncing ${operation.type}:`, error.message);

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
  const routine = operation.payload;
  const localId = routine.id;

  // Save to backend
  const savedRoutine = await saveRoutine(routine);

  console.log(
    `[AutoSync] Routine synced. Local ID: ${localId} → Server ID: ${savedRoutine.id}`
  );

  // Update local cache with server ID
  await updateLocalRoutineId(localId, savedRoutine.id);

  // Update any sessions that reference this routine
  await updateSessionRoutineIds(localId, savedRoutine.id);
}

/**
 * Sync UPDATE_ROUTINE operation
 */
async function syncUpdateRoutine(operation: PendingOperation): Promise<void> {
  const { id, routine } = operation.payload;

  // If it's a local ID, we need to find the real ID first
  const realId = await getServerIdForLocalId(id);

  if (realId) {
    await updateRoutineById(realId, routine);
    console.log(`[AutoSync] Routine updated. ID: ${realId}`);
  } else {
    // If no mapping exists, treat as create
    console.log(
      `[AutoSync] No server ID found for ${id}, creating new routine`
    );
    await syncCreateRoutine({ ...operation, type: "CREATE_ROUTINE" });
  }
}

/**
 * Sync CREATE_SESSION operation
 */
async function syncCreateSession(operation: PendingOperation): Promise<void> {
  const { routineId, session } = operation.payload;

  // If routine has local ID, map to server ID
  const realRoutineId = await getServerIdForLocalId(routineId);

  if (!realRoutineId) {
    console.warn(
      `[AutoSync] Cannot sync session - routine ${routineId} not synced yet`
    );
    throw new Error("Parent routine not synced");
  }

  await saveRoutineSession(realRoutineId, session);
  console.log(`[AutoSync] Session synced for routine: ${realRoutineId}`);
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
      const routines = JSON.parse(routinesStr);
      const updated = routines.map((r: any) =>
        r.id === localId ? { ...r, id: serverId, _isPending: false } : r
      );
      await AsyncStorage.setItem("@local_routines", JSON.stringify(updated));
    }

    // Update main routines cache (for WorkoutScreen list)
    const mainCacheStr = await AsyncStorage.getItem("@routines_cache");
    if (mainCacheStr) {
      const mainCache = JSON.parse(mainCacheStr);
      const updatedMain = mainCache.map((r: any) =>
        r.id === localId ? { ...r, id: serverId, _isPending: false } : r
      );
      await AsyncStorage.setItem("@routines_cache", JSON.stringify(updatedMain));
      console.log("[AutoSync] Updated main routines cache: local_id → server_id");
    }
  } catch (error) {
    console.error("[AutoSync] Failed to update routine ID mapping:", error);
  }
}

/**
 * Get server ID for local ID
 */
async function getServerIdForLocalId(
  localId: string
): Promise<string | null> {
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
  console.log("[AutoSync] Starting auto-sync service");

  // Listen to network changes
  const unsubscribe = NetInfo.addEventListener(async (state) => {
    if (state.isConnected && state.isInternetReachable) {
      console.log("[AutoSync] Network connected, triggering sync...");
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
  console.log("[AutoSync] Stopping auto-sync service");

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
  console.log("[AutoSync] Force sync requested");
  return await processSyncQueue();
}

/**
 * Check if currently syncing
 */
export function isSyncInProgress(): boolean {
  return isSyncing;
}
