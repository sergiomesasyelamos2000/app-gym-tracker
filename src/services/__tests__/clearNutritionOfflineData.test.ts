import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  NUTRITION_DIARY_CACHE_KEY,
  NUTRITION_FAVORITES_KEY,
  NUTRITION_OFFLINE_EXACT_KEYS,
} from "../nutritionOfflineKeys";
import { clearNutritionOfflineData } from "../clearNutritionOfflineData";
import { useNutritionStore } from "../../store/useNutritionStore";
import { useSyncStore } from "../../store/useSyncStore";
import { SYNC_QUEUE_KEY } from "../syncQueue";

describe("clearNutritionOfflineData", () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    (AsyncStorage.getAllKeys as jest.Mock).mockImplementation(async () =>
      Array.from(memory.keys())
    );
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) =>
      memory.has(key) ? memory.get(key)! : null
    );
    (AsyncStorage.setItem as jest.Mock).mockImplementation(
      async (key: string, value: string) => {
        memory.set(key, value);
      }
    );
    (AsyncStorage.removeItem as jest.Mock).mockImplementation(
      async (key: string) => {
        memory.delete(key);
      }
    );
    (AsyncStorage.multiRemove as jest.Mock).mockImplementation(
      async (keys: string[]) => {
        keys.forEach((key) => memory.delete(key));
      }
    );

    useNutritionStore.setState({
      userProfile: {
        id: "p1",
        userId: "u1",
      } as never,
      hasProfile: true,
      todayEntries: [],
      favoritesLastUpdate: 1,
    });
    useSyncStore.setState({
      pendingOperations: 2,
      lastSyncAt: "2026-01-01T00:00:00.000Z",
      syncErrors: [],
      isSyncing: false,
    });
  });

  it("removes nutrition keys and strips only nutrition queue ops", async () => {
    memory.set(NUTRITION_DIARY_CACHE_KEY, JSON.stringify({}));
    memory.set(NUTRITION_FAVORITES_KEY, "[]");
    memory.set("@routines_cache", "[]");
    memory.set(
      SYNC_QUEUE_KEY,
      JSON.stringify([
        {
          id: "1",
          type: "DELETE_ROUTINE",
          payload: { id: "r1" },
          timestamp: 1,
          retries: 0,
        },
        {
          id: "2",
          type: "DELETE_FOOD_ENTRY",
          payload: { id: "e1" },
          timestamp: 2,
          retries: 0,
        },
      ])
    );

    await clearNutritionOfflineData();

    for (const key of NUTRITION_OFFLINE_EXACT_KEYS) {
      expect(memory.has(key)).toBe(false);
    }
    expect(memory.has("@routines_cache")).toBe(true);

    const queue = JSON.parse(memory.get(SYNC_QUEUE_KEY) ?? "[]");
    expect(queue).toHaveLength(1);
    expect(queue[0].type).toBe("DELETE_ROUTINE");

    const nutrition = useNutritionStore.getState();
    expect(nutrition.userProfile).toBeNull();
    expect(nutrition.hasProfile).toBe(false);

    expect(useSyncStore.getState().pendingOperations).toBe(1);
  });
});
