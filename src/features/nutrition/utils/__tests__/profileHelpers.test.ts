import { normalizeProfileDTO, ProfileInput } from "../profileHelpers";

describe("normalizeProfileDTO", () => {
  const mockProfile: ProfileInput = {
    anthropometrics: {
      weight: 80.123,
      height: 180.6,
      age: 30.9,
      gender: "male",
      activityLevel: "sedentary",
    },
    goals: {
      weightGoal: "lose",
      targetWeight: 75.555,
      weeklyWeightChange: 0.555,
    },
    macroGoals: {
      dailyCalories: 2000.9,
      protein: 150.1,
      carbs: 200.5,
      fat: 60.0,
    },
    preferences: {
      weightUnit: "kg",
      heightUnit: "cm",
    },
  };

  it("should round numeric values correctly", () => {
    const result = normalizeProfileDTO(mockProfile, "user-123");

    // Weight: 1 decimal
    expect(result.anthropometrics.weight).toBe(80.1);

    // Height: Integer
    expect(result.anthropometrics.height).toBe(181);

    // Age: Integer
    expect(result.anthropometrics.age).toBe(31);

    // Target Weight: 1 decimal
    expect(result.goals.targetWeight).toBe(75.6);

    // Weekly Change: 2 decimals
    expect(result.goals.weeklyWeightChange).toBe(0.56);

    // Macros: Integers
    expect(result.macroGoals.dailyCalories).toBe(2001);
    expect(result.macroGoals.protein).toBe(150);
    expect(result.macroGoals.carbs).toBe(201);
  });

  it("should use provided userId if present", () => {
    const profileWithId = { ...mockProfile, userId: "provided-id" };
    const result = normalizeProfileDTO(profileWithId, "default-id");
    expect(result.userId).toBe("provided-id");
  });

  it("should fallback to currentUserId if userId missing", () => {
    const result = normalizeProfileDTO(mockProfile, "fallback-id");
    expect(result.userId).toBe("fallback-id");
  });
});
