import {
  CreateCustomMealDto,
  CreateCustomProductDto,
  CreateFoodEntryDto,
  CustomMealResponseDto,
  CustomProductResponseDto,
  FoodEntryResponseDto,
  MealProductDto,
  UpdateCustomProductDto,
  UpdateFoodEntryDto,
} from "@sergiomesasyelamos2000/shared";
import uuid from "react-native-uuid";
import { execQuery, getDatabase } from "../../database/sqliteClient";
import { enqueueOperation } from "../offlineQueueService";
import { syncService } from "../syncService";

/**
 * Guarda una entrada de comida offline
 */
export async function saveFoodEntryOffline(
  entry: CreateFoodEntryDto & { id?: string }
): Promise<FoodEntryResponseDto> {
  const db = await getDatabase();
  const entryId = entry.id || (uuid.v4() as string);
  const now = new Date().toISOString();

  const query = `
    INSERT OR REPLACE INTO food_entries
    (id, userId, productCode, productName, productImage, date, mealType, quantity, unit,
     customUnitName, customUnitGrams, calories, protein, carbs, fat, sugar, fiber, sodium,
     createdAt, synced, deleted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
  `;

  await db.runAsync(query, [
    entryId,
    entry.userId,
    entry.productCode,
    entry.productName,
    entry.productImage ?? null,
    entry.date,
    entry.mealType,
    entry.quantity,
    entry.unit,
    entry.customUnitName ?? null,
    entry.customUnitGrams ?? null,
    entry.calories,
    entry.protein,
    entry.carbs,
    entry.fat,
    entry.sugar ?? null,
    entry.fiber ?? null,
    entry.sodium ?? null,
    now,
  ]);

  // Add to sync queue
  await enqueueOperation("food_entry", entryId, "CREATE", {
    ...entry,
    id: entryId,
    createdAt: now,
  });

  // Try to sync
  syncService.sync().catch((err) => console.log("Sync deferred:", err));

  return { ...entry, id: entryId, createdAt: new Date(now) };
}

/**
 * Obtiene entradas de comida por usuario y fecha
 */
export async function getFoodEntriesOffline(
  userId: string,
  date: string
): Promise<FoodEntryResponseDto[]> {
  const query = `
    SELECT * FROM food_entries
    WHERE userId = ? AND date = ? AND deleted = 0
    ORDER BY createdAt DESC
  `;

  return await execQuery(query, [userId, date]);
}

/**
 * Actualiza una entrada de comida
 */
export async function updateFoodEntryOffline(
  entryId: string,
  updates: UpdateFoodEntryDto
): Promise<void> {
  const db = await getDatabase();

  const query = `
    UPDATE food_entries
    SET quantity = ?, calories = ?, protein = ?, carbs = ?, fat = ?, synced = 0
    WHERE id = ?
  `;

  await db.runAsync(query, [
    updates.quantity ?? 0,
    updates.calories ?? 0,
    updates.protein ?? 0,
    updates.carbs ?? 0,
    updates.fat ?? 0,
    entryId,
  ]);

  // Add to sync queue
  await enqueueOperation("food_entry", entryId, "UPDATE", {
    id: entryId,
    ...updates,
  });

  // Try to sync
  syncService.sync().catch((err) => console.log("Sync deferred:", err));
}

/**
 * Elimina una entrada de comida
 */
export async function deleteFoodEntryOffline(entryId: string): Promise<void> {
  const db = await getDatabase();

  const query = `
    UPDATE food_entries
    SET deleted = 1, synced = 0
    WHERE id = ?
  `;

  await db.runAsync(query, [entryId]);

  // Add to sync queue
  await enqueueOperation("food_entry", entryId, "DELETE", { id: entryId });

  // Try to sync
  syncService.sync().catch((err) => console.log("Sync deferred:", err));
}

/**
 * Guarda un producto personalizado offline
 */
export async function saveCustomProductOffline(
  product: CreateCustomProductDto & { id?: string }
): Promise<CustomProductResponseDto> {
  const db = await getDatabase();
  const productId =
    "id" in product && typeof product.id === "string"
      ? product.id
      : (uuid.v4() as string);
  const now = new Date().toISOString();

  const query = `
    INSERT OR REPLACE INTO custom_products
    (id, userId, name, description, image, brand, barcode,
     caloriesPer100, proteinPer100, carbsPer100, fatPer100,
     fiberPer100, sugarPer100, sodiumPer100,
     servingSize, servingUnit, createdAt, updatedAt, synced, deleted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
  `;

  await db.runAsync(query, [
    productId,
    product.userId,
    product.name,
    product.description ?? null,
    product.image ?? null,
    product.brand ?? null,
    product.barcode ?? null,
    product.caloriesPer100 ?? null,
    product.proteinPer100 ?? null,
    product.carbsPer100 ?? null,
    product.fatPer100 ?? null,
    product.fiberPer100 ?? null,
    product.sugarPer100 ?? null,
    product.sodiumPer100 ?? null,
    product.servingSize ?? null,
    product.servingUnit ?? null,
    now,
    now,
  ]);

  // Add to sync queue
  await enqueueOperation("custom_product", productId, "CREATE", {
    ...product,
    id: productId,
    createdAt: now,
    updatedAt: now,
  });

  // Try to sync
  syncService.sync().catch((err) => console.log("Sync deferred:", err));

  return {
    ...product,
    id: productId,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  };
}

/**
 * Obtiene productos personalizados por usuario
 */
export async function getCustomProductsOffline(
  userId: string
): Promise<CustomProductResponseDto[]> {
  const query = `
    SELECT * FROM custom_products
    WHERE userId = ? AND deleted = 0
    ORDER BY createdAt DESC
  `;

  return await execQuery(query, [userId]);
}

/**
 * Actualiza un producto personalizado
 */
export async function updateCustomProductOffline(
  productId: string,
  updates: UpdateCustomProductDto
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  const query = `
    UPDATE custom_products
    SET name = ?, description = ?, caloriesPer100 = ?, proteinPer100 = ?,
        carbsPer100 = ?, fatPer100 = ?, updatedAt = ?, synced = 0
    WHERE id = ?
  `;

  await db.runAsync(query, [
    updates.name ?? null,
    updates.description ?? null,
    updates.caloriesPer100 ?? null,
    updates.proteinPer100 ?? null,
    updates.carbsPer100 ?? null,
    updates.fatPer100 ?? null,
    now,
    productId,
  ]);

  // ... resto del código
}

/**
 * Elimina un producto personalizado
 */
export async function deleteCustomProductOffline(
  productId: string
): Promise<void> {
  const db = await getDatabase();

  const query = `
    UPDATE custom_products
    SET deleted = 1, synced = 0, updatedAt = ?
    WHERE id = ?
  `;

  await db.runAsync(query, [new Date().toISOString(), productId]);

  // Add to sync queue
  await enqueueOperation("custom_product", productId, "DELETE", {
    id: productId,
  });

  // Try to sync
  syncService.sync().catch((err) => console.log("Sync deferred:", err));
}

/**
 * Guarda una comida personalizada offline
 */
export async function saveCustomMealOffline(
  meal: CreateCustomMealDto & { id?: string }
): Promise<CustomMealResponseDto> {
  const db = await getDatabase();
  const mealId =
    "id" in meal && typeof meal.id === "string"
      ? meal.id
      : (uuid.v4() as string);
  const now = new Date().toISOString();

  // Calculate totals from products
  const totalCalories = meal.products.reduce(
    (sum: number, p: MealProductDto) => sum + p.calories,
    0
  );
  const totalProtein = meal.products.reduce(
    (sum: number, p: MealProductDto) => sum + p.protein,
    0
  );
  const totalCarbs = meal.products.reduce(
    (sum: number, p: MealProductDto) => sum + p.carbs,
    0
  );
  const totalFat = meal.products.reduce(
    (sum: number, p: MealProductDto) => sum + p.fat,
    0
  );
  const totalSugar = meal.products.reduce(
    (sum: number, p: MealProductDto) => sum + (p.sugar || 0),
    0
  );
  const totalFiber = meal.products.reduce(
    (sum: number, p: MealProductDto) => sum + (p.fiber || 0),
    0
  );
  const totalSodium = meal.products.reduce(
    (sum: number, p: MealProductDto) => sum + (p.sodium || 0),
    0
  );

  const query = `
    INSERT OR REPLACE INTO custom_meals
    (id, userId, name, description, image, products,
     totalCalories, totalProtein, totalCarbs, totalFat,
     createdAt, updatedAt, synced, deleted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
  `;

  await db.runAsync(query, [
    mealId,
    meal.userId,
    meal.name,
    meal.description ?? null, // Cambio aquí
    meal.image ?? null, // Cambio aquí
    JSON.stringify(meal.products),
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat,
    now,
    now,
  ]);

  // Add to sync queue
  await enqueueOperation("custom_meal", mealId, "CREATE", {
    ...meal,
    id: mealId,
    createdAt: now,
    updatedAt: now,
  });

  // Try to sync
  syncService.sync().catch((err) => console.log("Sync deferred:", err));

  return {
    ...meal,
    id: mealId,
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat,
    totalSugar: totalSugar || null,
    totalFiber: totalFiber || null,
    totalSodium: totalSodium || null,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  };
}

/**
 * Obtiene comidas personalizadas por usuario
 */
export async function getCustomMealsOffline(
  userId: string
): Promise<CustomMealResponseDto[]> {
  const query = `
    SELECT * FROM custom_meals
    WHERE userId = ? AND deleted = 0
    ORDER BY createdAt DESC
  `;

  const meals = await execQuery(query, [userId]);

  // Parse products JSON
  return meals.map((meal: CustomMealResponseDto) => ({
    ...meal,
    products: JSON.parse(
      meal.products as unknown as string
    ) as MealProductDto[],
  }));
}

/**
 * Elimina una comida personalizada
 */
export async function deleteCustomMealOffline(mealId: string): Promise<void> {
  const db = await getDatabase();

  const query = `
    UPDATE custom_meals
    SET deleted = 1, synced = 0, updatedAt = ?
    WHERE id = ?
  `;

  await db.runAsync(query, [new Date().toISOString(), mealId]);

  // Add to sync queue
  await enqueueOperation("custom_meal", mealId, "DELETE", { id: mealId });

  // Try to sync
  syncService.sync().catch((err) => console.log("Sync deferred:", err));
}
