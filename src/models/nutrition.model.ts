// Product from OpenFoodFacts API
export interface Product {
  code: string;
  name: string;
  image: string | null;
  calories: number;
  carbohydrates: number;
  protein: number;
  fat: number;
  grams: number;
  others: Array<{ label: string; value: any }>;
}

// Legacy interface (keeping for compatibility)
export interface NutritionItem {
  name: string;
  calories: number;
  proteins: { quantity: number; unit: string };
  carbs: { quantity: number; unit: string };
  fats: { quantity: number; unit: string };
  servingSize: number;
}

// User profile and goals
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";
export type Gender = "male" | "female" | "other";
export type WeightGoal = "lose" | "maintain" | "gain";
export type WeightUnit = "kg" | "lbs";
export type HeightUnit = "cm" | "ft";

export interface UserAnthropometrics {
  weight: number;
  height: number;
  age: number;
  gender: Gender;
  activityLevel: ActivityLevel;
}

export interface UserGoals {
  weightGoal: WeightGoal;
  targetWeight: number;
  weeklyWeightChange: number; // kg per week (0.25, 0.5, 0.75, 1.0)
}

export interface MacroGoals {
  dailyCalories: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
}

export interface UserPreferences {
  weightUnit: WeightUnit;
  heightUnit: HeightUnit;
}

export interface UserNutritionProfile {
  id?: string;
  userId: string;
  anthropometrics: UserAnthropometrics;
  goals: UserGoals;
  macroGoals: MacroGoals;
  preferences: UserPreferences;
  createdAt?: Date;
  updatedAt?: Date;
}

// Food diary
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type FoodUnit = "gram" | "ml" | "portion" | "custom";

export interface FoodEntry {
  id?: string;
  userId: string;
  productCode: string;
  productName: string;
  productImage: string | null;
  date: string; // YYYY-MM-DD format
  mealType: MealType;
  quantity: number;
  unit: FoodUnit;
  customUnitName?: string; // for custom portions
  customUnitGrams?: number; // grams per custom portion
  // Nutritional values (calculated based on quantity)
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  createdAt?: Date;
  disabled?: boolean;
}

export interface DailyNutritionSummary {
  date: string;
  entries: FoodEntry[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  goals: MacroGoals;
}
