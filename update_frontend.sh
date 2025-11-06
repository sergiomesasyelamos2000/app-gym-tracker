#!/bin/bash

# Add new interfaces to nutrition.model.ts
cat >> src/models/nutrition.model.ts << 'EOF'

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
  userId: string;
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
  productCode: string;
  productName: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  isCustom?: boolean;
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
EOF

echo "✅ Added new interfaces to nutrition.model.ts"

# Add new API methods to nutritionService.ts
cat >> src/features/nutrition/services/nutritionService.ts << 'EOF'

// ==================== SHOPPING LIST ====================

export async function addToShoppingList(
  item: Omit<ShoppingListItem, "id" | "createdAt" | "purchased">
): Promise<ShoppingListItem> {
  return apiFetch("nutrition/shopping-list", {
    method: "POST",
    body: JSON.stringify(item),
  });
}

export async function getShoppingList(userId: string): Promise<ShoppingListItem[]> {
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

export async function togglePurchased(itemId: string): Promise<ShoppingListItem> {
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

export async function isFavorite(userId: string, productCode: string): Promise<boolean> {
  const result = await apiFetch(`nutrition/favorites/${userId}/check/${productCode}`, {
    method: "GET",
  });
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
  return apiFetch(`nutrition/favorites/${userId}/search?query=${encodeURIComponent(query)}`, {
    method: "GET",
  });
}

// ==================== CUSTOM PRODUCTS ====================

export async function createCustomProduct(
  product: Omit<CustomProduct, "id" | "createdAt" | "updatedAt">
): Promise<CustomProduct> {
  return apiFetch("nutrition/custom-products", {
    method: "POST",
    body: JSON.stringify(product),
  });
}

export async function getCustomProducts(userId: string): Promise<CustomProduct[]> {
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
  return apiFetch(`nutrition/custom-products/${productId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
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
  return apiFetch(`nutrition/custom-products/${userId}/search?query=${encodeURIComponent(query)}`, {
    method: "GET",
  });
}

// ==================== CUSTOM MEALS ====================

export async function createCustomMeal(
  meal: Omit<CustomMeal, "id" | "createdAt" | "updatedAt" | "totalCalories" | "totalProtein" | "totalCarbs" | "totalFat">
): Promise<CustomMeal> {
  return apiFetch("nutrition/custom-meals", {
    method: "POST",
    body: JSON.stringify(meal),
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
  return apiFetch(`nutrition/custom-meals/${mealId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
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
  return apiFetch(`nutrition/custom-meals/${userId}/search?query=${encodeURIComponent(query)}`, {
    method: "GET",
  });
}
EOF

echo "✅ Added new API methods to nutritionService.ts"
echo ""
echo "=========================================="
echo "Frontend services updated successfully!"
echo "=========================================="

