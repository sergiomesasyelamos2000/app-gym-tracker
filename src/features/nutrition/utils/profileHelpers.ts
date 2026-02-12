import { UserNutritionProfileResponseDto } from "@entity-data-models/dtos";

export type ProfileInput = Omit<
  UserNutritionProfileResponseDto,
  "id" | "createdAt" | "updatedAt" | "userId"
> & {
  userId?: string;
};

export const normalizeProfileDTO = (
  profile: ProfileInput,
  currentUserId: string
) => {
  const userId = profile.userId || currentUserId;

  return {
    userId,
    anthropometrics: {
      weight: Math.round(profile.anthropometrics.weight * 10) / 10,
      height: Math.round(profile.anthropometrics.height),
      age: Math.round(profile.anthropometrics.age),
      gender: profile.anthropometrics.gender,
      activityLevel: profile.anthropometrics.activityLevel,
    },
    goals: {
      weightGoal: profile.goals.weightGoal,
      targetWeight: Math.round(profile.goals.targetWeight * 10) / 10,
      weeklyWeightChange:
        Math.round(profile.goals.weeklyWeightChange * 100) / 100,
    },
    macroGoals: {
      dailyCalories: Math.round(profile.macroGoals.dailyCalories),
      protein: Math.round(profile.macroGoals.protein),
      carbs: Math.round(profile.macroGoals.carbs),
      fat: Math.round(profile.macroGoals.fat),
    },
    preferences: {
      weightUnit: profile.preferences.weightUnit,
      heightUnit: profile.preferences.heightUnit,
    },
  };
};
