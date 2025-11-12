import { apiFetch } from "../../../api";
import {
  Product,
  UserNutritionProfile,
  FoodEntry,
  DailyNutritionSummary,
  MacroGoals,
  ShoppingListItem,
  CustomProduct,
  CustomMeal,
  FavoriteProduct,
} from "../../../models/nutrition.model";
import * as FileSystem from "expo-file-system";

async function convertImageToBase64(uri: string): Promise<string | null> {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Detectar tipo de imagen
    let mimeType = "image/jpeg";
    if (uri.toLowerCase().includes(".png")) {
      mimeType = "image/png";
    } else if (uri.toLowerCase().includes(".webp")) {
      mimeType = "image/webp";
    }

    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error("Error converting image to base64:", error);
    return null;
  }
}

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
  // Ensure userId is included in the entry
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

// ==================== SHOPPING LIST ====================

export async function addToShoppingList(
  item: Omit<ShoppingListItem, "id" | "createdAt" | "purchased">
): Promise<ShoppingListItem> {
  return apiFetch("nutrition/shopping-list", {
    method: "POST",
    body: JSON.stringify(item),
  });
}

export async function getShoppingList(
  userId: string
): Promise<ShoppingListItem[]> {
  return apiFetch(`nutrition/shopping-list/${userId}`, {
    method: "GET",
  });
}

export async function updateShoppingListItem(
  itemId: string,
  updates: Partial<ShoppingListItem>
): Promise<ShoppingListItem> {
  return apiFetch(`nutrition/shopping-list/${itemId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function togglePurchased(
  itemId: string
): Promise<ShoppingListItem> {
  return apiFetch(`nutrition/shopping-list/${itemId}/toggle`, {
    method: "PUT",
  });
}

export async function deleteShoppingListItem(itemId: string): Promise<void> {
  return apiFetch(`nutrition/shopping-list/${itemId}`, {
    method: "DELETE",
  });
}

export async function clearPurchasedItems(userId: string): Promise<number> {
  return apiFetch(`nutrition/shopping-list/${userId}/purchased`, {
    method: "DELETE",
  });
}

export async function clearShoppingList(userId: string): Promise<void> {
  return apiFetch(`nutrition/shopping-list/${userId}/all`, {
    method: "DELETE",
  });
}

// ==================== FAVORITES ====================

export async function addFavorite(
  favorite: Omit<FavoriteProduct, "id" | "createdAt">
): Promise<FavoriteProduct> {
  return apiFetch("nutrition/favorites", {
    method: "POST",
    body: JSON.stringify(favorite),
  });
}

export async function getFavorites(userId: string): Promise<FavoriteProduct[]> {
  return apiFetch(`nutrition/favorites/${userId}`, {
    method: "GET",
  });
}

export async function isFavorite(
  userId: string,
  productCode: string
): Promise<boolean> {
  const result = await apiFetch(
    `nutrition/favorites/${userId}/check/${productCode}`,
    {
      method: "GET",
    }
  );
  return result;
}

export async function removeFavoriteByProductCode(
  userId: string,
  productCode: string
): Promise<void> {
  return apiFetch(`nutrition/favorites/${userId}/product/${productCode}`, {
    method: "DELETE",
  });
}

export async function searchFavorites(
  userId: string,
  query: string
): Promise<FavoriteProduct[]> {
  return apiFetch(
    `nutrition/favorites/${userId}/search?query=${encodeURIComponent(query)}`,
    {
      method: "GET",
    }
  );
}

// ==================== CUSTOM PRODUCTS ====================

export async function createCustomProduct(
  product: Omit<CustomProduct, "id" | "createdAt" | "updatedAt">
): Promise<CustomProduct> {
  // Convertir imagen a base64 si existe
  let imageBase64: string | undefined = undefined;
  if (product.image && product.image.startsWith("file://")) {
    imageBase64 = (await convertImageToBase64(product.image)) || undefined;
  } else if (product.image) {
    imageBase64 = product.image; // Ya es una URL o base64
  }

  return apiFetch("nutrition/custom-products", {
    method: "POST",
    body: JSON.stringify({
      ...product,
      image: imageBase64,
    }),
  });
}

export async function getCustomProducts(
  userId: string
): Promise<CustomProduct[]> {
  return apiFetch(`nutrition/custom-products/${userId}`, {
    method: "GET",
  });
}

export async function getCustomProductById(
  userId: string,
  productId: string
): Promise<CustomProduct> {
  return apiFetch(`nutrition/custom-products/${userId}/${productId}`, {
    method: "GET",
  });
}

export async function updateCustomProduct(
  productId: string,
  updates: Partial<CustomProduct>
): Promise<CustomProduct> {
  // Convertir imagen a base64 si existe y es local
  let imageBase64 = updates.image;
  if (imageBase64 && imageBase64.startsWith("file://")) {
    imageBase64 = (await convertImageToBase64(imageBase64)) || undefined;
  }

  return apiFetch(`nutrition/custom-products/${productId}`, {
    method: "PUT",
    body: JSON.stringify({
      ...updates,
      image: imageBase64,
    }),
  });
}

export async function deleteCustomProduct(productId: string): Promise<void> {
  return apiFetch(`nutrition/custom-products/${productId}`, {
    method: "DELETE",
  });
}

export async function searchCustomProducts(
  userId: string,
  query: string
): Promise<CustomProduct[]> {
  return apiFetch(
    `nutrition/custom-products/${userId}/search?query=${encodeURIComponent(
      query
    )}`,
    {
      method: "GET",
    }
  );
}

// ==================== CUSTOM MEALS ====================

export async function createCustomMeal(
  meal: Omit<
    CustomMeal,
    | "id"
    | "createdAt"
    | "updatedAt"
    | "totalCalories"
    | "totalProtein"
    | "totalCarbs"
    | "totalFat"
  >
): Promise<CustomMeal> {
  // Convertir imagen a base64 si existe
  let imageBase64: string | undefined = undefined;
  if (meal.image && meal.image.startsWith("file://")) {
    imageBase64 = (await convertImageToBase64(meal.image)) || undefined;
  } else if (meal.image) {
    imageBase64 = meal.image; // Ya es una URL o base64
  }

  return apiFetch("nutrition/custom-meals", {
    method: "POST",
    body: JSON.stringify({
      ...meal,
      image: imageBase64,
    }),
  });
}

export async function getCustomMeals(userId: string): Promise<CustomMeal[]> {
  return apiFetch(`nutrition/custom-meals/${userId}`, {
    method: "GET",
  });
}

export async function getCustomMealById(
  userId: string,
  mealId: string
): Promise<CustomMeal> {
  return apiFetch(`nutrition/custom-meals/${userId}/${mealId}`, {
    method: "GET",
  });
}

export async function updateCustomMeal(
  mealId: string,
  updates: Partial<CustomMeal>
): Promise<CustomMeal> {
  // Convertir imagen a base64 si existe y es local
  let imageBase64 = updates.image;
  if (imageBase64 && imageBase64.startsWith("file://")) {
    imageBase64 = (await convertImageToBase64(imageBase64)) || undefined;
  }

  return apiFetch(`nutrition/custom-meals/${mealId}`, {
    method: "PUT",
    body: JSON.stringify({
      ...updates,
      image: imageBase64,
    }),
  });
}

export async function deleteCustomMeal(mealId: string): Promise<void> {
  return apiFetch(`nutrition/custom-meals/${mealId}`, {
    method: "DELETE",
  });
}

export async function duplicateCustomMeal(mealId: string): Promise<CustomMeal> {
  return apiFetch(`nutrition/custom-meals/${mealId}/duplicate`, {
    method: "POST",
  });
}

export async function searchCustomMeals(
  userId: string,
  query: string
): Promise<CustomMeal[]> {
  return apiFetch(
    `nutrition/custom-meals/${userId}/search?query=${encodeURIComponent(
      query
    )}`,
    {
      method: "GET",
    }
  );
}
