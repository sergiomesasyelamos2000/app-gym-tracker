import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch } from "../../../../api/client";
import { NUTRITION_DIARY_CACHE_KEY } from "../../../../services/nutritionOfflineKeys";
import {
  getDailyEntries,
  hasLocalDiarySnapshot,
  hasLocalNutritionSnapshot,
} from "../nutritionService";

jest.mock("../../../../api/client", () => ({
  apiFetch: jest.fn(),
}));

const mockedApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

const emptySummary = (date: string, title = "Cached") => ({
  date,
  entries: [
    {
      id: "e1",
      userId: "u1",
      productCode: "c1",
      productName: title,
      date,
      mealType: "breakfast" as const,
      quantity: 100,
      unit: "g" as const,
      calories: 100,
      protein: 10,
      carbs: 10,
      fat: 2,
      createdAt: new Date().toISOString(),
    },
  ],
  totals: {
    calories: 100,
    protein: 10,
    carbs: 10,
    fat: 2,
    sugar: 0,
    fiber: 0,
    sodium: 0,
  },
  goals: {
    dailyCalories: 2000,
    protein: 150,
    carbs: 200,
    fat: 60,
  },
  hasProfile: true,
});

describe("nutritionService local-first diary", () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    mockedApiFetch.mockReset();
    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) =>
      memory.has(key) ? memory.get(key)! : null
    );
    (AsyncStorage.setItem as jest.Mock).mockImplementation(
      async (key: string, value: string) => {
        memory.set(key, value);
      }
    );
  });

  it("returns cached diary day immediately and refreshes in background", async () => {
    const cached = emptySummary("2026-10-15", "Cached");
    memory.set(
      NUTRITION_DIARY_CACHE_KEY,
      JSON.stringify({ "2026-10-15": cached })
    );

    mockedApiFetch.mockResolvedValue(emptySummary("2026-10-15", "Fresh"));

    const result = await getDailyEntries("u1", "2026-10-15");
    expect(result.entries[0].productName).toBe("Cached");
    expect(mockedApiFetch).toHaveBeenCalled();

    await Promise.resolve();
    await Promise.resolve();

    const next = JSON.parse(memory.get(NUTRITION_DIARY_CACHE_KEY) ?? "{}");
    expect(next["2026-10-15"].entries[0].productName).toBe("Fresh");
  });

  it("awaits network when diary day cache is missing", async () => {
    mockedApiFetch.mockResolvedValue(emptySummary("2026-10-16", "From network"));

    const result = await getDailyEntries("u1", "2026-10-16");
    expect(result.entries[0].productName).toBe("From network");
    expect(memory.has(NUTRITION_DIARY_CACHE_KEY)).toBe(true);
  });

  it("hasLocalDiarySnapshot distinguishes miss vs empty day hit", async () => {
    await expect(hasLocalDiarySnapshot("2026-10-15")).resolves.toBe(false);
    memory.set(
      NUTRITION_DIARY_CACHE_KEY,
      JSON.stringify({
        "2026-10-15": {
          ...emptySummary("2026-10-15"),
          entries: [],
          totals: {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            sugar: 0,
            fiber: 0,
            sodium: 0,
          },
        },
      })
    );
    await expect(hasLocalDiarySnapshot("2026-10-15")).resolves.toBe(true);
    await expect(hasLocalDiarySnapshot("2026-10-16")).resolves.toBe(false);
  });

  it("hasLocalNutritionSnapshot is true when diary cache exists", async () => {
    await expect(hasLocalNutritionSnapshot()).resolves.toBe(false);
    memory.set(NUTRITION_DIARY_CACHE_KEY, JSON.stringify({ "2026-10-15": {} }));
    await expect(hasLocalNutritionSnapshot()).resolves.toBe(true);
  });
});
