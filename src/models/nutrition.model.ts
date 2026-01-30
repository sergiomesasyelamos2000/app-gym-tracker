import {
  MappedProduct as Product,
  FoodEntryResponseDto as FoodEntry,
  ShoppingListItemEntity as ShoppingListItem,
  FavoriteProductResponseDto as FavoriteProduct,
  CustomMealResponseDto as CustomMeal,
  CustomProductResponseDto as CustomProduct,
  MealProductDto as MealProduct,
  MealType,
  FoodUnit,
  ActivityLevel,
  Gender,
  WeightGoal,
  HeightUnit,
  WeightUnit,
} from "@entity-data-models/index";

export {
  Product,
  FoodEntry,
  ShoppingListItem,
  FavoriteProduct,
  CustomMeal,
  CustomProduct,
  MealProduct,
  MealType,
  FoodUnit,
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
