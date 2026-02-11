import { execQuery, execRun, getDatabase } from '../../database/sqliteClient';
import { enqueueOperation } from '../offlineQueueService';
import { syncService } from '../syncService';
import { v4 as uuidv4 } from 'react-native-uuid';

/**
 * Guarda una entrada de comida offline
 */
export async function saveFoodEntryOffline(entry: any): Promise<any> {
  const db = await getDatabase();
  const entryId = entry.id || uuidv4();
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
    entry.productImage,
    entry.date,
    entry.mealType,
    entry.quantity,
    entry.unit,
    entry.customUnitName,
    entry.customUnitGrams,
    entry.calories,
    entry.protein,
    entry.carbs,
    entry.fat,
    entry.sugar,
    entry.fiber,
    entry.sodium,
    now,
  ]);

  // Add to sync queue
  await enqueueOperation('food_entry', entryId, 'CREATE', {
    ...entry,
    id: entryId,
    createdAt: now,
  });

  // Try to sync
  syncService.sync().catch((err) => console.log('Sync deferred:', err));

  return { ...entry, id: entryId, createdAt: now };
}

/**
 * Obtiene entradas de comida por usuario y fecha
 */
export async function getFoodEntriesOffline(userId: string, date: string): Promise<any[]> {
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
export async function updateFoodEntryOffline(entryId: string, updates: any): Promise<void> {
  const db = await getDatabase();

  const query = `
    UPDATE food_entries
    SET quantity = ?, calories = ?, protein = ?, carbs = ?, fat = ?, synced = 0
    WHERE id = ?
  `;

  await db.runAsync(query, [
    updates.quantity,
    updates.calories,
    updates.protein,
    updates.carbs,
    updates.fat,
    entryId,
  ]);

  // Add to sync queue
  await enqueueOperation('food_entry', entryId, 'UPDATE', {
    id: entryId,
    ...updates,
  });

  // Try to sync
  syncService.sync().catch((err) => console.log('Sync deferred:', err));
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
  await enqueueOperation('food_entry', entryId, 'DELETE', { id: entryId });

  // Try to sync
  syncService.sync().catch((err) => console.log('Sync deferred:', err));
}

/**
 * Guarda un producto personalizado offline
 */
export async function saveCustomProductOffline(product: any): Promise<any> {
  const db = await getDatabase();
  const productId = product.id || uuidv4();
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
    product.description,
    product.image,
    product.brand,
    product.barcode,
    product.caloriesPer100,
    product.proteinPer100,
    product.carbsPer100,
    product.fatPer100,
    product.fiberPer100,
    product.sugarPer100,
    product.sodiumPer100,
    product.servingSize,
    product.servingUnit,
    now,
    now,
  ]);

  // Add to sync queue
  await enqueueOperation('custom_product', productId, 'CREATE', {
    ...product,
    id: productId,
    createdAt: now,
    updatedAt: now,
  });

  // Try to sync
  syncService.sync().catch((err) => console.log('Sync deferred:', err));

  return { ...product, id: productId, createdAt: now, updatedAt: now };
}

/**
 * Obtiene productos personalizados por usuario
 */
export async function getCustomProductsOffline(userId: string): Promise<any[]> {
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
  updates: any
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
    updates.name,
    updates.description,
    updates.caloriesPer100,
    updates.proteinPer100,
    updates.carbsPer100,
    updates.fatPer100,
    now,
    productId,
  ]);

  // Add to sync queue
  await enqueueOperation('custom_product', productId, 'UPDATE', {
    id: productId,
    ...updates,
    updatedAt: now,
  });

  // Try to sync
  syncService.sync().catch((err) => console.log('Sync deferred:', err));
}

/**
 * Elimina un producto personalizado
 */
export async function deleteCustomProductOffline(productId: string): Promise<void> {
  const db = await getDatabase();

  const query = `
    UPDATE custom_products
    SET deleted = 1, synced = 0, updatedAt = ?
    WHERE id = ?
  `;

  await db.runAsync(query, [new Date().toISOString(), productId]);

  // Add to sync queue
  await enqueueOperation('custom_product', productId, 'DELETE', { id: productId });

  // Try to sync
  syncService.sync().catch((err) => console.log('Sync deferred:', err));
}

/**
 * Guarda una comida personalizada offline
 */
export async function saveCustomMealOffline(meal: any): Promise<any> {
  const db = await getDatabase();
  const mealId = meal.id || uuidv4();
  const now = new Date().toISOString();

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
    meal.description,
    meal.image,
    JSON.stringify(meal.products),
    meal.totalCalories,
    meal.totalProtein,
    meal.totalCarbs,
    meal.totalFat,
    now,
    now,
  ]);

  // Add to sync queue
  await enqueueOperation('custom_meal', mealId, 'CREATE', {
    ...meal,
    id: mealId,
    createdAt: now,
    updatedAt: now,
  });

  // Try to sync
  syncService.sync().catch((err) => console.log('Sync deferred:', err));

  return { ...meal, id: mealId, createdAt: now, updatedAt: now };
}

/**
 * Obtiene comidas personalizadas por usuario
 */
export async function getCustomMealsOffline(userId: string): Promise<any[]> {
  const query = `
    SELECT * FROM custom_meals
    WHERE userId = ? AND deleted = 0
    ORDER BY createdAt DESC
  `;

  const meals = await execQuery(query, [userId]);

  // Parse products JSON
  return meals.map((meal: any) => ({
    ...meal,
    products: JSON.parse(meal.products),
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
  await enqueueOperation('custom_meal', mealId, 'DELETE', { id: mealId });

  // Try to sync
  syncService.sync().catch((err) => console.log('Sync deferred:', err));
}
