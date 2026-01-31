import {
  calculateMacroGoals,
  getRecommendedWeightChangeRange,
  getEstimatedTimeToGoal,
  getMetabolicRates,
} from "../macroCalculator";
import {
  UserAnthropometrics,
  UserGoals,
  Gender,
  ActivityLevel,
  WeightGoal,
} from "../../features/nutrition/models/nutrition.model";

describe("MacroCalculator Logic", () => {
  const baseAnthropometrics: UserAnthropometrics = {
    weight: 80, // kg
    height: 180, // cm
    age: 30, // years
    gender: "male",
    activityLevel: "moderately_active",
  };

  describe("calculateMacroGoals", () => {
    it("should calculate deficit macros for weight loss", () => {
      const goals: UserGoals = {
        weightGoal: "lose",
        targetWeight: 75,
        weeklyWeightChange: 0.5,
      };

      const result = calculateMacroGoals(baseAnthropometrics, goals);

      expect(result.protein).toBeGreaterThan(0);
      expect(result.carbs).toBeGreaterThan(0);
      expect(result.fat).toBeGreaterThan(0);

      // Verification: Protein 2.2g/kg for weight loss = 80 * 2.2 = 176
      expect(result.protein).toBe(176);
      // Verification: 25% Fat

      // Calculate Expected TDEE approx:
      // BMR = 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
      // TDEE = 1780 * 1.55 = 2759
      // Deficit = 0.5 * 7700 / 7 = 550
      // Target = 2759 - 550 = 2209
      expect(result.dailyCalories).toBeGreaterThan(2100);
      expect(result.dailyCalories).toBeLessThan(2300);
    });

    it("should calculate surplus macros for weight gain", () => {
      const goals: UserGoals = {
        weightGoal: "gain",
        targetWeight: 85,
        weeklyWeightChange: 0.25,
      };

      const result = calculateMacroGoals(baseAnthropometrics, goals);

      // Protein 2.0g/kg for gain = 160
      expect(result.protein).toBe(160);
      expect(result.dailyCalories).toBeGreaterThan(2759); // Should be TDEE + surplus
    });

    it("should maintain maintenance calories", () => {
      const goals: UserGoals = {
        weightGoal: "maintain",
        targetWeight: 80,
        weeklyWeightChange: 0,
      };

      const result = calculateMacroGoals(baseAnthropometrics, goals);

      // Protein 1.8g/kg for maintenance = 144
      expect(result.protein).toBe(144);
    });
  });

  describe("getRecommendedWeightChangeRange", () => {
    it("should return valid range for weight loss", () => {
      const range = getRecommendedWeightChangeRange("lose");
      expect(range.min).toBe(0.25);
      expect(range.max).toBe(1.0);
    });

    it("should return valid range for weight gain", () => {
      const range = getRecommendedWeightChangeRange("gain");
      expect(range.min).toBe(0.25);
      expect(range.max).toBe(0.5);
    });

    it("should return zeros for maintenance", () => {
      const range = getRecommendedWeightChangeRange("maintain");
      expect(range.min).toBe(0);
      expect(range.max).toBe(0);
    });
  });

  describe("getEstimatedTimeToGoal", () => {
    it("should calculate correct weeks for loss", () => {
      // Lose 5kg at 0.5kg/week = 10 weeks
      const result = getEstimatedTimeToGoal(80, 75, 0.5);
      expect(result.weeks).toBe(10);
    });

    it("should calculate correct weeks for gain", () => {
      // Gain 5kg at 0.25kg/week = 20 weeks
      const result = getEstimatedTimeToGoal(80, 85, 0.25);
      expect(result.weeks).toBe(20);
    });
  });

  describe("Edge Cases", () => {
    it("should handle boundary anthropometrics safely", () => {
      const edgeCaseAuth: UserAnthropometrics = {
        weight: 300,
        height: 250,
        age: 100,
        gender: "male",
        activityLevel: "sedentary",
      };

      const goals: UserGoals = {
        weightGoal: "lose",
        targetWeight: 200,
        weeklyWeightChange: 1.0,
      };

      const result = calculateMacroGoals(edgeCaseAuth, goals);
      expect(result.dailyCalories).toBeGreaterThan(0);
      expect(result.protein).toBeGreaterThan(0);
    });
  });
});
