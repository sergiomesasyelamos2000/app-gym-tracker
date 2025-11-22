import {
  HeightUnit,
  MacroGoals,
  UserAnthropometrics,
  UserGoals,
  WeightUnit,
} from "./nutrition.model";

// user-nutrition-profile.dto.ts
export interface UserNutritionProfileResponseDto {
  id: string;
  userId: string;
  anthropometrics: UserAnthropometrics;
  goals: UserGoals;
  macroGoals: MacroGoals;
  preferences: {
    weightUnit: WeightUnit;
    heightUnit: HeightUnit;
  };
  createdAt: Date;
  updatedAt: Date;
}
