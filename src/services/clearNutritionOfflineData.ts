import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNutritionStore } from "../store/useNutritionStore";
import { useSyncStore } from "../store/useSyncStore";
import {
  NUTRITION_OFFLINE_EXACT_KEYS,
  isNutritionOfflinePrefixedKey,
} from "./nutritionOfflineKeys";
import {
  filterSyncQueue,
  getPendingCount,
  isNutritionSyncOperation,
} from "./syncQueue";

/**
 * Purge nutrition offline caches and strip nutrition ops from the shared
 * `@sync_queue`. Does not remove routine ops or wipe the whole queue.
 */
export async function clearNutritionOfflineData(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const prefixed = allKeys.filter(isNutritionOfflinePrefixedKey);
    const exact = NUTRITION_OFFLINE_EXACT_KEYS.filter((key) =>
      allKeys.includes(key)
    );
    const toRemove = Array.from(new Set([...exact, ...prefixed]));
    if (toRemove.length > 0) {
      await AsyncStorage.multiRemove(toRemove);
    }
  } catch (error) {
    console.error(
      "[NutritionOfflinePurge] Failed to clear AsyncStorage keys:",
      error
    );
    await Promise.all(
      NUTRITION_OFFLINE_EXACT_KEYS.map((key) =>
        AsyncStorage.removeItem(key).catch(() => undefined)
      )
    );
  }

  try {
    await filterSyncQueue((op) => !isNutritionSyncOperation(op));
  } catch (error) {
    console.error(
      "[NutritionOfflinePurge] Failed to filter sync queue:",
      error
    );
  }

  useNutritionStore.getState().clearNutritionData();

  try {
    const remaining = await getPendingCount();
    useSyncStore.getState().setPendingOperations(remaining);
  } catch {
    // ignore
  }
}
