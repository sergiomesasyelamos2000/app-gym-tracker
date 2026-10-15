import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  addToSyncQueue,
  filterSyncQueue,
  getPendingOperations,
} from "../syncQueue";
import { deleteRoutineOffline } from "../offlineRoutineService";

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: {
    fetch: jest.fn(async () => ({
      isConnected: false,
      isInternetReachable: false,
    })),
    addEventListener: jest.fn(() => jest.fn()),
  },
}));

jest.mock("../../features/routine/services/routineService", () => ({
  createRoutineFolder: jest.fn(),
  deleteRoutine: jest.fn(),
  deleteRoutineFolder: jest.fn(),
  renameRoutineFolder: jest.fn(),
  saveRoutine: jest.fn(),
  saveRoutineLayout: jest.fn(),
  saveRoutineSession: jest.fn(),
  updateRoutineById: jest.fn(),
}));

jest.mock("../autoSyncService", () => ({
  processSyncQueue: jest.fn(async () => ({ success: 0, failed: 0 })),
}));

describe("deleteRoutineOffline + filterSyncQueue", () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
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
  });

  it("filterSyncQueue drops matching ops", async () => {
    await addToSyncQueue("DELETE_ROUTINE", { id: "keep" });
    await addToSyncQueue("DELETE_ROUTINE", { id: "drop" });
    await filterSyncQueue(
      (op) =>
        !(
          op.type === "DELETE_ROUTINE" &&
          (op.payload as { id: string }).id === "drop"
        )
    );
    const ops = await getPendingOperations();
    expect(ops).toHaveLength(1);
    expect((ops[0].payload as { id: string }).id).toBe("keep");
  });

  it("removes local routine from cache and cancels its CREATE op", async () => {
    const localId = "local_123";
    memory.set(
      "@routines_cache",
      JSON.stringify([
        { id: localId, title: "Local" },
        { id: "server-1", title: "Server" },
      ])
    );
    memory.set(
      "@local_routines",
      JSON.stringify([{ id: localId, title: "Local" }])
    );
    await addToSyncQueue("CREATE_ROUTINE", {
      id: localId,
      title: "Local",
      exercises: [],
    } as never);

    await deleteRoutineOffline(localId);

    const cache = JSON.parse(memory.get("@routines_cache") ?? "[]");
    expect(cache.map((r: { id: string }) => r.id)).toEqual(["server-1"]);
    expect(memory.has(`@routine_${localId}`)).toBe(false);

    const ops = await getPendingOperations();
    expect(
      ops.some(
        (op) =>
          op.type === "CREATE_ROUTINE" &&
          (op.payload as { id?: string }).id === localId
      )
    ).toBe(false);
  });

  it("enqueues DELETE_ROUTINE when offline for server ids", async () => {
    memory.set(
      "@routines_cache",
      JSON.stringify([{ id: "server-9", title: "Gone" }])
    );

    await deleteRoutineOffline("server-9");

    const cache = JSON.parse(memory.get("@routines_cache") ?? "[]");
    expect(cache).toEqual([]);

    const ops = await getPendingOperations();
    expect(ops.some((op) => op.type === "DELETE_ROUTINE")).toBe(true);
    expect(
      ops.find((op) => op.type === "DELETE_ROUTINE")?.payload
    ).toEqual({ id: "server-9" });
  });
});
