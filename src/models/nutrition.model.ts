// Product from OpenFoodFacts API (optimizado para productos españoles)
export interface Product {
  code: string;
  name: string;
  brand?: string | null;
  image: string | null;
  nutritionGrade?: string | null;
  categories?: string | null;
  servingSize?: string | null;
  calories: number;
  carbohydrates: number;
  protein: number;
  fat: number;
  fiber?: number | null;
  sugar?: number | null;
  sodium?: number | null;
  saturatedFat?: number | null;
  grams: number; // Base de cálculo (siempre 100g por defecto)
  others: Array<{ label: string; value: any }>;
  isCustomProduct?: boolean;
  customProductId?: string;
  servingUnit?: string;
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
  | "lightly_active"
  | "moderately_active"
  | "very_active"
  | "extra_active";

export type Gender = "male" | "female" | "other";
export type WeightGoal = "lose" | "maintain" | "gain";
export type HeightUnit = "cm" | "ft";
export type WeightUnit = "kg" | "lbs";

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
  goals: {
    dailyCalories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  hasProfile: boolean;
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
