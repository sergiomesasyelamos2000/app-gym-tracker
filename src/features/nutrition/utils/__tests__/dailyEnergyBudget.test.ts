import {
  buildBurnedCaloriesByDate,
  computeDailyEnergyBudget,
  sumCaloriesBurnedForDate,
  toLocalDateKey,
} from "../dailyEnergyBudget";

describe("dailyEnergyBudget", () => {
  describe("toLocalDateKey", () => {
    it("formats a Date as YYYY-MM-DD in local time", () => {
      const key = toLocalDateKey(new Date(2026, 8, 15, 18, 30, 0));
      expect(key).toBe("2026-09-15");
    });
  });

  describe("buildBurnedCaloriesByDate", () => {
    it("aggregates burned kcal by local day for O(1) lookup", () => {
      const sessions = [
        { createdAt: new Date(2026, 8, 15, 10, 0, 0), caloriesBurned: 200 },
        { createdAt: new Date(2026, 8, 14, 10, 0, 0), caloriesBurned: 500 },
        { createdAt: new Date(2026, 8, 15, 18, 0, 0), caloriesBurned: 120 },
      ];
      const map = buildBurnedCaloriesByDate(sessions);
      expect(map["2026-09-15"]).toBe(320);
      expect(map["2026-09-14"]).toBe(500);
    });
  });

  describe("sumCaloriesBurnedForDate", () => {
    it("sums caloriesBurned only for the matching local day", () => {
      const sessions = [
        { createdAt: "2026-09-15T10:00:00.000Z", caloriesBurned: 200 },
        { createdAt: "2026-09-14T10:00:00.000Z", caloriesBurned: 500 },
        { createdAt: "2026-09-15T18:00:00.000Z", caloriesBurned: 120 },
        { createdAt: "2026-09-15T12:00:00.000Z", caloriesBurned: null },
      ];
      const day = toLocalDateKey(sessions[0].createdAt);
      const sameDayTotal = sessions
        .filter((s) => toLocalDateKey(s.createdAt) === day)
        .reduce((sum, s) => sum + (s.caloriesBurned || 0), 0);

      expect(sumCaloriesBurnedForDate(sessions, day)).toBe(sameDayTotal);
    });

    it("returns 0 when there are no sessions", () => {
      expect(sumCaloriesBurnedForDate([], "2026-09-15")).toBe(0);
    });
  });

  describe("computeDailyEnergyBudget", () => {
    it("adds burned calories to the available budget", () => {
      const result = computeDailyEnergyBudget({
        consumed: 1800,
        target: 2000,
        burned: 320,
      });
      expect(result.effectiveTarget).toBe(2320);
      expect(result.remaining).toBe(520);
      expect(result.burned).toBe(320);
    });

    it("works with zero burned (legacy behavior)", () => {
      const result = computeDailyEnergyBudget({
        consumed: 1500,
        target: 2000,
        burned: 0,
      });
      expect(result.remaining).toBe(500);
      expect(result.effectiveTarget).toBe(2000);
    });
  });
});
