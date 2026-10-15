import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  addFoodEntryOffline,
  deleteFoodEntryOffline,
} from "../offlineNutritionService";
import { NUTRITION_DIARY_CACHE_KEY } from "../nutritionOfflineKeys";
import { getPendingOperations } from "../syncQueue";

const mockMemory = new Map<string, string>();

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

jest.mock("../../features/nutrition/services/nutritionService", () => ({
  getCurrentUserId: jest.fn(() => "u1"),
  addFoodEntry: jest.fn(),
  updateFoodEntry: jest.fn(),
  deleteFoodEntry: jest.fn(),
  createCustomProduct: jest.fn(),
  updateCustomProduct: jest.fn(),
  deleteCustomProduct: jest.fn(),
  createCustomMeal: jest.fn(),
  updateCustomMeal: jest.fn(),
  deleteCustomMeal: jest.fn(),
  addFavorite: jest.fn(),
  removeFavoriteByProductCode: jest.fn(),
  writeDiaryDayCache: jest.fn(async (summary: { date: string }) => {
    const raw = mockMemory.get("@nutrition_diary_cache_v1");
    const cache = raw ? JSON.parse(raw) : {};
    cache[summary.date] = summary;
    mockMemory.set("@nutrition_diary_cache_v1", JSON.stringify(cache));
  }),
}));

jest.mock("../autoSyncService", () => ({
  processSyncQueue: jest.fn(async () => ({ success: 0, failed: 0 })),
}));

describe("offlineNutritionService diary", () => {
  beforeEach(() => {
    mockMemory.clear();
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) =>
      mockMemory.has(key) ? mockMemory.get(key)! : null
    );
    (AsyncStorage.setItem as jest.Mock).mockImplementation(
      async (key: string, value: string) => {
        mockMemory.set(key, value);
      }
    );
    (AsyncStorage.removeItem as jest.Mock).mockImplementation(
      async (key: string) => {
        mockMemory.delete(key);
      }
    );
  });

  it("queues CREATE_FOOD_ENTRY and writes diary cache offline", async () => {
    const saved = await addFoodEntryOffline({
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
    });

    expect(saved.id.startsWith("local_")).toBe(true);
    const cache = JSON.parse(mockMemory.get(NUTRITION_DIARY_CACHE_KEY) ?? "{}");
    expect(cache["2026-10-15"].entries).toHaveLength(1);
    expect(cache["2026-10-15"].totals.calories).toBe(80);

    const ops = await getPendingOperations();
    expect(ops.some((op) => op.type === "CREATE_FOOD_ENTRY")).toBe(true);
  });

  it("cancel CREATE when deleting a local-only entry", async () => {
    const saved = await addFoodEntryOffline({
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
    });

    await deleteFoodEntryOffline(saved.id);

    const ops = await getPendingOperations();
    expect(ops.filter((op) => op.type === "CREATE_FOOD_ENTRY")).toHaveLength(0);
    const cache = JSON.parse(mockMemory.get(NUTRITION_DIARY_CACHE_KEY) ?? "{}");
    expect(cache["2026-10-15"].entries).toHaveLength(0);
  });
});
