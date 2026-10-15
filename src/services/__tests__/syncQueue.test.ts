import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  SYNC_QUEUE_KEY,
  addToSyncQueue,
  getPendingOperations,
} from "../syncQueue";

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: {
    fetch: jest.fn(async () => ({
      isConnected: true,
      isInternetReachable: true,
    })),
    addEventListener: jest.fn(() => jest.fn()),
  },
}));

describe("syncQueue", () => {
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
    (AsyncStorage.clear as jest.Mock).mockImplementation(async () => {
      memory.clear();
    });
  });

  it("enqueues DELETE_ROUTINE ops", async () => {
    await addToSyncQueue("DELETE_ROUTINE", { id: "routine-1" });
    const ops = await getPendingOperations();
    expect(ops).toHaveLength(1);
    expect(ops[0].type).toBe("DELETE_ROUTINE");
    expect(ops[0].payload).toEqual({ id: "routine-1" });
  });

  it("coalesces UPSERT_LAYOUT to a single latest op", async () => {
    await addToSyncQueue("UPSERT_LAYOUT", {
      rootOrder: [{ type: "routine", id: "a" }],
      folders: [],
    });
    await addToSyncQueue("UPSERT_LAYOUT", {
      rootOrder: [{ type: "routine", id: "b" }],
      folders: [],
    });

    const ops = await getPendingOperations();
    expect(ops.filter((op) => op.type === "UPSERT_LAYOUT")).toHaveLength(1);
    expect(ops[0].payload).toEqual({
      rootOrder: [{ type: "routine", id: "b" }],
      folders: [],
    });
    expect(memory.get(SYNC_QUEUE_KEY)).toBeTruthy();
  });

  it("enqueues nutrition diary and favorite ops", async () => {
    await addToSyncQueue("CREATE_FOOD_ENTRY", {
      userId: "u1",
      productCode: "123",
      productName: "Yogur",
      date: "2026-10-15",
      mealType: "breakfast",
      quantity: 100,
      unit: "g",
      calories: 80,
      protein: 5,
      carbs: 10,
      fat: 2,
      id: "local_e1",
    });
    await addToSyncQueue("REMOVE_FAVORITE", { productCode: "123" });

    const ops = await getPendingOperations();
    expect(ops.map((op) => op.type)).toEqual([
      "CREATE_FOOD_ENTRY",
      "REMOVE_FAVORITE",
    ]);
  });
});
