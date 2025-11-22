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
  isCustomProduct?: boolean;
  customProductId?: string;
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
  id: string;
  userId: string; // ID del usuario al que pertenece este perfil
  anthropometrics: UserAnthropometrics;
  goals: UserGoals;
  macroGoals: MacroGoals;
  preferences: UserPreferences;
  createdAt?: Date;
  updatedAt?: Date;
}

// Food diary
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type FoodUnit = "g" | "ml" | "portion" | "custom";

export interface FoodEntry {
  id?: string;
  userId?: string;
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

// Shopping List
export interface ShoppingListItem {
  id: string;
  userId: string;
  productCode: string;
  productName: string;
  productImage?: string;
  quantity: number;
  unit: FoodUnit;
  customUnitName?: string;
  customUnitGrams?: number;
  purchased: boolean;
  createdAt: Date;
}

// Favorite Products
export interface FavoriteProduct {
  id: string;
  userId?: string;
  productCode: string;
  productName: string;
  productImage?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  createdAt: Date;
}

// Custom Products
export interface CustomProduct {
  id: string;
  userId: string;
  name: string;
  description?: string;
  image?: string;
  brand?: string;
  caloriesPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
  fiberPer100?: number;
  sugarPer100?: number;
  sodiumPer100?: number;
  servingSize?: number;
  servingUnit?: string;
  barcode?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Custom Meals
export interface MealProduct {
  id: string;
  isCustom?: boolean;
  productCode: string;
  productName: string;
  productImage?: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface CustomMeal {
  id: string;
  userId: string;
  name: string;
  description?: string;
  image?: string;
  products: MealProduct[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  createdAt: Date;
  updatedAt: Date;
}
