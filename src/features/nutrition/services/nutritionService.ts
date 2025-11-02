import { apiFetch } from "../../../api";
import {
  Product,
  UserNutritionProfile,
  FoodEntry,
  DailyNutritionSummary,
  MacroGoals,
} from "../../../models/nutrition.model";

// AI Chat
export async function postText(text: string): Promise<any> {
  return apiFetch("nutrition", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

// Photo analysis
export async function postPhoto(formData: FormData): Promise<any> {
  return apiFetch("nutrition/photo", {
    method: "POST",
    body: formData,
  });
}

// Barcode scanning
export async function scanBarcode(code: string): Promise<Product> {
  return apiFetch("nutrition/barcode", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

// Product search
export async function getProducts(
  page = 1,
  pageSize = 20
): Promise<{ products: Product[]; total: number }> {
  return apiFetch(`nutrition/products?page=${page}&pageSize=${pageSize}`, {
    method: "GET",
  });
}

// Get product detail by code
export async function getProductDetail(code: string): Promise<Product> {
  return apiFetch(`nutrition/products/${code}`, {
    method: "GET",
  });
}

// User Profile Management
export async function getUserProfile(
  userId: string
): Promise<UserNutritionProfile> {
  return apiFetch(`nutrition/profile/${userId}`, {
    method: "GET",
  });
}

export async function createUserProfile(
  profile: Omit<UserNutritionProfile, "id" | "createdAt" | "updatedAt">
): Promise<UserNutritionProfile> {
  // Transformar el objeto para que coincida con CreateUserNutritionProfileDto
  const dto = {
    userId: profile.userId,
    anthropometrics: {
      weight: profile.anthropometrics.weight,
      height: profile.anthropometrics.height,
      age: profile.anthropometrics.age,
      gender: profile.anthropometrics.gender,
      activityLevel: profile.anthropometrics.activityLevel,
    },
    goals: {
      weightGoal: profile.goals.weightGoal,
      targetWeight: profile.goals.targetWeight,
      weeklyWeightChange: profile.goals.weeklyWeightChange,
    },
    macroGoals: {
      dailyCalories: profile.macroGoals.dailyCalories,
      protein: profile.macroGoals.protein,
      carbs: profile.macroGoals.carbs,
      fat: profile.macroGoals.fat,
    },
    preferences: {
      weightUnit: profile.preferences.weightUnit,
      heightUnit: profile.preferences.heightUnit,
    },
  };

  return apiFetch("nutrition/profile", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<UserNutritionProfile>
): Promise<UserNutritionProfile> {
  return apiFetch(`nutrition/profile/${userId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function updateMacroGoals(
  userId: string,
  goals: MacroGoals
): Promise<UserNutritionProfile> {
  return apiFetch(`nutrition/profile/${userId}/goals`, {
    method: "PUT",
    body: JSON.stringify(goals),
  });
}

// Food Diary Management
export async function addFoodEntry(
  entry: Omit<FoodEntry, "id" | "createdAt">
): Promise<FoodEntry> {
  return apiFetch("nutrition/diary", {
    method: "POST",
    body: JSON.stringify(entry),
  });
}

export async function getDailyEntries(
  userId: string,
  date: string
): Promise<DailyNutritionSummary> {
  return apiFetch(`nutrition/diary/${userId}/${date}`, {
    method: "GET",
  });
}

export async function updateFoodEntry(
  entryId: string,
  updates: Partial<FoodEntry>
): Promise<FoodEntry> {
  return apiFetch(`nutrition/diary/${entryId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function deleteFoodEntry(entryId: string): Promise<void> {
  return apiFetch(`nutrition/diary/${entryId}`, {
    method: "DELETE",
  });
}

// Get weekly/monthly summaries
export async function getWeeklySummary(
  userId: string,
  startDate: string
): Promise<DailyNutritionSummary[]> {
  return apiFetch(`nutrition/diary/${userId}/weekly?startDate=${startDate}`, {
    method: "GET",
  });
}

export async function getMonthlySummary(
  userId: string,
  year: number,
  month: number
): Promise<DailyNutritionSummary[]> {
  return apiFetch(
    `nutrition/diary/${userId}/monthly?year=${year}&month=${month}`,
    {
      method: "GET",
    }
  );
}
