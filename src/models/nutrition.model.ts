import {
  ActivityLevel,
  CustomMealResponseDto as CustomMeal,
  CustomProductResponseDto as CustomProduct,
  FavoriteProductResponseDto as FavoriteProduct,
  FoodEntryResponseDto as FoodEntry,
  FoodUnit,
  Gender,
  HeightUnit,
  MealProductDto as MealProduct,
  MealType,
  MappedProduct as Product,
  ShoppingListItemEntity as ShoppingListItem,
  WeightGoal,
  WeightUnit,
} from "@entity-data-models/index";

export {
  ActivityLevel,
  CustomMeal,
  CustomProduct,
  FavoriteProduct,
  FoodEntry,
  FoodUnit,
  Gender,
  HeightUnit,
  MealProduct,
  MealType,
  Product,
  ShoppingListItem,
  WeightGoal,
  WeightUnit,
};

// User profile and goals (using shared types where possible)
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
  weeklyWeightChange: number;
}

export interface MacroGoals {
  dailyCalories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface UserPreferences {
  weightUnit: WeightUnit;
  heightUnit: HeightUnit;
}

export interface DailyNutritionSummary {
  date: string;
  entries: FoodEntry[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    sugar: number;
    fiber: number;
    sodium: number;
  };
  goals: {
    dailyCalories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  hasProfile: boolean;
}
