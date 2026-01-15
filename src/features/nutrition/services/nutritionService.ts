import * as FileSystem from "expo-file-system";
import { apiFetch } from "../../../api";
import {
  CustomMeal,
  CustomProduct,
  DailyNutritionSummary,
  FavoriteProduct,
  FoodEntry,
  MacroGoals,
  Product,
  ShoppingListItem,
} from "../../../models/nutrition.model";
import { UserNutritionProfileResponseDto } from "../../../models/user-nutrition-profile.model";
import { useAuthStore } from "../../../store/useAuthStore";

/**
 * Get current user ID from auth store
 * @throws Error if user is not authenticated
 */
function getCurrentUserId(): string {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) {
    throw new Error("User not authenticated. Please log in.");
  }
  return userId;
}

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
export async function postText(
  text: string,
  history?: Array<{ role: string; content: string }>,
  userId?: string
): Promise<any> {
  return apiFetch("nutrition", {
    method: "POST",
    body: JSON.stringify({ text, history, userId }),
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

// Product search - Lista de productos populares españoles
export async function getProducts(
  page = 1,
  pageSize = 20
): Promise<{ products: Product[]; total: number }> {
  return apiFetch(`nutrition/products?page=${page}&pageSize=${pageSize}`, {
    method: "GET",
  });
}

// Búsqueda avanzada de productos por nombre (optimizado para España)
export async function searchProductsByName(
  searchTerm: string,
  page = 1,
  pageSize = 20
): Promise<{ products: Product[]; total: number }> {
  if (!searchTerm || searchTerm.trim().length === 0) {
    return { products: [], total: 0 };
  }

  return apiFetch(
    `nutrition/products/search?q=${encodeURIComponent(
      searchTerm.trim()
    )}&page=${page}&pageSize=${pageSize}`,
    {
      method: "GET",
    }
  );
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
): Promise<UserNutritionProfileResponseDto> {
  const id = userId || getCurrentUserId();
  return apiFetch(`nutrition/profile/${id}`, {
    method: "GET",
  });
}

export async function createUserProfile(
  profile: Omit<
    UserNutritionProfileResponseDto,
    "id" | "createdAt" | "updatedAt" | "userId"
  > & {
    userId?: string;
  }
): Promise<UserNutritionProfileResponseDto> {
  const userId = profile.userId || getCurrentUserId();

  // Transformar el objeto para que coincida con CreateUserNutritionProfileDto
  // Asegurarse de que todos los valores numéricos estén redondeados para compatibilidad con la base de datos
  const dto = {
    userId,
    anthropometrics: {
      weight: Math.round(profile.anthropometrics.weight * 10) / 10, // Redondear a 1 decimal
      height: Math.round(profile.anthropometrics.height),
      age: Math.round(profile.anthropometrics.age),
      gender: profile.anthropometrics.gender,
      activityLevel: profile.anthropometrics.activityLevel,
    },
    goals: {
      weightGoal: profile.goals.weightGoal,
      targetWeight: Math.round(profile.goals.targetWeight * 10) / 10, // Redondear a 1 decimal
      weeklyWeightChange:
        Math.round(profile.goals.weeklyWeightChange * 100) / 100, // Redondear a 2 decimales
    },
    macroGoals: {
      dailyCalories: Math.round(profile.macroGoals.dailyCalories), // Entero
      protein: Math.round(profile.macroGoals.protein), // Entero
      carbs: Math.round(profile.macroGoals.carbs), // Entero
      fat: Math.round(profile.macroGoals.fat), // Entero
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
  updates: Partial<UserNutritionProfileResponseDto>,
  userId?: string
): Promise<UserNutritionProfileResponseDto> {
  const id = userId || getCurrentUserId();
  return apiFetch(`nutrition/profile/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function updateMacroGoals(
  goals: MacroGoals,
  userId?: string
): Promise<UserNutritionProfileResponseDto> {
  const id = userId || getCurrentUserId();
  return apiFetch(`nutrition/profile/${id}/goals`, {
    method: "PUT",
    body: JSON.stringify(goals),
  });
}

// Food Diary Management
export async function addFoodEntry(
  entry: Omit<FoodEntry, "id" | "createdAt" | "userId"> & { userId?: string }
): Promise<FoodEntry> {
  const userId = entry.userId || getCurrentUserId();
  return apiFetch("nutrition/diary", {
    method: "POST",
    body: JSON.stringify({ ...entry, userId }),
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
  startDate: string,
  userId?: string
): Promise<DailyNutritionSummary[]> {
  const id = userId || getCurrentUserId();
  return apiFetch(`nutrition/diary/${id}/weekly?startDate=${startDate}`, {
    method: "GET",
  });
}

export async function getMonthlySummary(
  year: number,
  month: number,
  userId?: string
): Promise<DailyNutritionSummary[]> {
  const id = userId || getCurrentUserId();
  return apiFetch(`nutrition/diary/${id}/monthly?year=${year}&month=${month}`, {
    method: "GET",
  });
}

// ==================== SHOPPING LIST ====================

export async function addToShoppingList(
  item: Omit<ShoppingListItem, "id" | "createdAt" | "purchased" | "userId"> & {
    userId?: string;
  }
): Promise<ShoppingListItem> {
  const userId = item.userId || getCurrentUserId();
  return apiFetch("nutrition/shopping-list", {
    method: "POST",
    body: JSON.stringify({ ...item, userId }),
  });
}

export async function getShoppingList(
  userId?: string
): Promise<ShoppingListItem[]> {
  const id = userId || getCurrentUserId();
  return apiFetch(`nutrition/shopping-list/${id}`, {
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
  itemId: string,
  userId: string
): Promise<ShoppingListItem> {
  return apiFetch(`nutrition/shopping-list/${userId}/${itemId}/toggle`, {
    method: "PUT",
  });
}

export async function deleteShoppingListItem(itemId: string): Promise<void> {
  return apiFetch(`nutrition/shopping-list/${itemId}`, {
    method: "DELETE",
  });
}

export async function clearPurchasedItems(userId?: string): Promise<number> {
  const id = userId || getCurrentUserId();
  return apiFetch(`nutrition/shopping-list/${id}/purchased`, {
    method: "DELETE",
  });
}

export async function clearShoppingList(userId?: string): Promise<void> {
  const id = userId || getCurrentUserId();
  return apiFetch(`nutrition/shopping-list/${id}/all`, {
    method: "DELETE",
  });
}

// ==================== FAVORITES ====================

export async function addFavorite(
  favorite: Omit<FavoriteProduct, "id" | "createdAt" | "userId"> & {
    userId?: string;
  }
): Promise<FavoriteProduct> {
  const userId = favorite.userId || getCurrentUserId();
  return apiFetch("nutrition/favorites", {
    method: "POST",
    body: JSON.stringify({ ...favorite, userId }),
  });
}

export async function getFavorites(
  userId?: string
): Promise<FavoriteProduct[]> {
  const id = userId || getCurrentUserId();
  return apiFetch(`nutrition/favorites/${id}`, {
    method: "GET",
  });
}

export async function isFavorite(
  productCode: string,
  userId?: string
): Promise<boolean> {
  const id = userId || getCurrentUserId();
  const result = await apiFetch(
    `nutrition/favorites/${id}/check/${productCode}`,
    {
      method: "GET",
    }
  );
  return result;
}

export async function removeFavoriteByProductCode(
  productCode: string,
  userId?: string
): Promise<void> {
  const id = userId || getCurrentUserId();
  return apiFetch(`nutrition/favorites/${id}/product/${productCode}`, {
    method: "DELETE",
  });
}

export async function searchFavorites(
  query: string,
  userId?: string
): Promise<FavoriteProduct[]> {
  const id = userId || getCurrentUserId();
  return apiFetch(
    `nutrition/favorites/${id}/search?query=${encodeURIComponent(query)}`,
    {
      method: "GET",
    }
  );
}

// ==================== CUSTOM PRODUCTS ====================

export async function createCustomProduct(
  product: Omit<CustomProduct, "id" | "createdAt" | "updatedAt" | "userId"> & {
    userId?: string;
  }
): Promise<CustomProduct> {
  const userId = product.userId || getCurrentUserId();

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
      userId,
      image: imageBase64,
    }),
  });
}

export async function getCustomProducts(
  userId?: string
): Promise<CustomProduct[]> {
  const id = userId || getCurrentUserId();
  return apiFetch(`nutrition/custom-products/${id}`, {
    method: "GET",
  });
}

export async function getCustomProductById(
  productId: string,
  userId?: string
): Promise<CustomProduct> {
  const id = userId || getCurrentUserId();
  return apiFetch(`nutrition/custom-products/${id}/${productId}`, {
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
  query: string,
  userId?: string
): Promise<CustomProduct[]> {
  const id = userId || getCurrentUserId();
  return apiFetch(
    `nutrition/custom-products/${id}/search?query=${encodeURIComponent(query)}`,
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
    | "userId"
  > & { userId?: string }
): Promise<CustomMeal> {
  const userId = meal.userId || getCurrentUserId();

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
      userId,
      image: imageBase64,
    }),
  });
}

export async function getCustomMeals(userId?: string): Promise<CustomMeal[]> {
  const id = userId || getCurrentUserId();
  return apiFetch(`nutrition/custom-meals/${id}`, {
    method: "GET",
  });
}

export async function getCustomMealById(
  mealId: string,
  userId?: string
): Promise<CustomMeal> {
  const id = userId || getCurrentUserId();
  return apiFetch(`nutrition/custom-meals/${id}/${mealId}`, {
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
  query: string,
  userId?: string
): Promise<CustomMeal[]> {
  const id = userId || getCurrentUserId();
  return apiFetch(
    `nutrition/custom-meals/${id}/search?query=${encodeURIComponent(query)}`,
    {
      method: "GET",
    }
  );
}
