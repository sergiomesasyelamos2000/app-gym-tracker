import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ROUTINE_OFFLINE_EXACT_KEYS,
  clearRoutineOfflineData,
  isRoutineOfflinePrefixedKey,
} from "../clearRoutineOfflineData";
import { useRoutineFolderStore } from "../../store/useRoutineFolderStore";
import { useSyncStore } from "../../store/useSyncStore";
import { SYNC_QUEUE_KEY } from "../syncQueue";

jest.mock("../../features/routine/services/routineService", () => ({
  invalidateRoutineSessionsCacheWrites: jest.fn(),
}));

describe("clearRoutineOfflineData", () => {
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

    useRoutineFolderStore.setState({
      folders: [{ id: "f1", title: "Grupo", routineIds: ["r1"] }],
      rootOrder: ["folder:f1"],
      expandedFolderIds: ["f1"],
      migratedLocalFolders: true,
    });
    useSyncStore.setState({
      pendingOperations: 3,
      lastSyncAt: "2026-01-01T00:00:00.000Z",
      syncErrors: ["x"],
      isSyncing: false,
    });
  });

  it("classifies prefixed offline keys", () => {
    expect(isRoutineOfflinePrefixedKey("@routine_abc")).toBe(true);
    expect(isRoutineOfflinePrefixedKey("@sessions_routine_abc")).toBe(true);
    expect(isRoutineOfflinePrefixedKey("@sessions_cache_v2")).toBe(true);
    expect(isRoutineOfflinePrefixedKey("@routines_cache")).toBe(false);
    expect(isRoutineOfflinePrefixedKey("auth-storage")).toBe(false);
  });

  it("removes routine keys and strips only routine queue ops", async () => {
    memory.set("@routines_cache", "[]");
    memory.set("@routine_local_1", "{}");
    memory.set("@sessions_routine_r1", "[]");
    memory.set("auth-storage", "{}");
    memory.set("unrelated", "1");
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
          type: "CREATE_FOOD_ENTRY",
          payload: {
            userId: "u1",
            productCode: "x",
            productName: "Y",
            date: "2026-01-01",
            mealType: "breakfast",
            quantity: 1,
            unit: "g",
            calories: 1,
            protein: 0,
            carbs: 0,
            fat: 0,
          },
          timestamp: 2,
          retries: 0,
        },
      ])
    );

    await clearRoutineOfflineData();

    for (const key of ROUTINE_OFFLINE_EXACT_KEYS) {
      expect(memory.has(key)).toBe(false);
    }
    expect(memory.has("@routine_local_1")).toBe(false);
    expect(memory.has("@sessions_routine_r1")).toBe(false);
    expect(memory.has("auth-storage")).toBe(true);
    expect(memory.has("unrelated")).toBe(true);

    const queue = JSON.parse(memory.get(SYNC_QUEUE_KEY) ?? "[]");
    expect(queue).toHaveLength(1);
    expect(queue[0].type).toBe("CREATE_FOOD_ENTRY");

    const folders = useRoutineFolderStore.getState();
    expect(folders.folders).toEqual([]);
    expect(folders.rootOrder).toEqual([]);
    expect(folders.migratedLocalFolders).toBe(false);

    expect(useSyncStore.getState().pendingOperations).toBe(1);
  });
});
