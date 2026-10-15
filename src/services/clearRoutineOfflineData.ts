import AsyncStorage from "@react-native-async-storage/async-storage";
import { invalidateRoutineSessionsCacheWrites } from "../features/routine/services/routineService";
import { useRoutineFolderStore } from "../store/useRoutineFolderStore";
import { useSyncStore } from "../store/useSyncStore";
import {
  filterSyncQueue,
  getPendingCount,
  isRoutineSyncOperation,
} from "./syncQueue";

/** Keys that always belong to the routines offline SoT (exact match). */
export const ROUTINE_OFFLINE_EXACT_KEYS = [
  "@routines_cache",
  "@routine_folders_cache",
  "@sessions_cache_v2",
  "@local_routines",
  "@local_sessions",
  "@routine_id_mapping",
  "@folder_id_mapping",
  "@pending_routines",
] as const;

/**
 * True for per-entity routine/session cache keys that must not survive logout.
 */
export function isRoutineOfflinePrefixedKey(key: string): boolean {
  return (
    key.startsWith("@routine_") ||
    key.startsWith("@sessions_routine_") ||
    key.startsWith("@sessions_cache")
  );
}

/**
 * Purge routine/session/folder offline caches and strip routine ops from the
 * shared `@sync_queue`. Does not wipe nutrition ops or delete the queue key.
 */
export async function clearRoutineOfflineData(): Promise<void> {
  invalidateRoutineSessionsCacheWrites();

  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const prefixed = allKeys.filter(isRoutineOfflinePrefixedKey);
    const exact = ROUTINE_OFFLINE_EXACT_KEYS.filter((key) =>
      allKeys.includes(key)
    );
    const toRemove = Array.from(new Set([...exact, ...prefixed]));
    if (toRemove.length > 0) {
      await AsyncStorage.multiRemove(toRemove);
    }
  } catch (error) {
    console.error("[OfflinePurge] Failed to clear AsyncStorage keys:", error);
    // Best-effort fallback for the critical keys.
    await Promise.all(
      ROUTINE_OFFLINE_EXACT_KEYS.map((key) =>
        AsyncStorage.removeItem(key).catch(() => undefined)
      )
    );
  }

  try {
    await filterSyncQueue((op) => !isRoutineSyncOperation(op));
  } catch (error) {
    console.error("[OfflinePurge] Failed to filter sync queue:", error);
  }

  useRoutineFolderStore.getState().resetLayout();

  try {
    const remaining = await getPendingCount();
    useSyncStore.getState().setPendingOperations(remaining);
  } catch {
    // ignore
  }
}
