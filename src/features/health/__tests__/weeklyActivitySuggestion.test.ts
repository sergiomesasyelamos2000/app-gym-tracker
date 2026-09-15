import { computeWeeklyActivitySuggestion } from "../weeklyActivitySuggestion";

describe("computeWeeklyActivitySuggestion", () => {
  it("returns null with too few training days", () => {
    const now = Date.now();
    const sessions = [
      {
        createdAt: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
        caloriesBurned: 300,
      },
      {
        createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
        caloriesBurned: 250,
      },
    ];
    expect(
      computeWeeklyActivitySuggestion({
        sessions,
        currentActivityLevel: "moderately_active",
        currentDailyCalories: 2200,
      })
    ).toBeNull();
  });

  it("suggests calorie bump and next activity level with enough burn", () => {
    const now = Date.now();
    const sessions = [1, 2, 3, 4].map((day) => ({
      createdAt: new Date(now - day * 24 * 60 * 60 * 1000).toISOString(),
      caloriesBurned: 350,
    }));

    const suggestion = computeWeeklyActivitySuggestion({
      sessions,
      currentActivityLevel: "moderately_active",
      currentDailyCalories: 2200,
    });

    expect(suggestion).not.toBeNull();
    expect(suggestion!.daysWithWorkouts).toBe(4);
    expect(suggestion!.totalBurnedLast7Days).toBe(1400);
    expect(suggestion!.suggestedCalorieBump).toBeGreaterThanOrEqual(100);
    expect(suggestion!.suggestedActivityLevel).toBe("very_active");
  });
});
