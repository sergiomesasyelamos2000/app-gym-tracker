import type {
  CreateCustomMealDto,
  CreateCustomProductDto,
  CreateFoodEntryDto,
  CustomMealResponseDto,
  CustomProductResponseDto,
  DailyNutritionSummary,
  FavoriteProductResponseDto,
  FoodEntryResponseDto,
  MappedProduct,
  UpdateCustomMealDto,
  UpdateCustomProductDto,
  UpdateFoodEntryDto,
} from "@sergiomesasyelamos2000/shared";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  addFavorite as apiAddFavorite,
  addFoodEntry as apiAddFoodEntry,
  createCustomMeal as apiCreateCustomMeal,
  createCustomProduct as apiCreateCustomProduct,
  deleteCustomMeal as apiDeleteCustomMeal,
  deleteCustomProduct as apiDeleteCustomProduct,
  deleteFoodEntry as apiDeleteFoodEntry,
  getCurrentUserId,
  removeFavoriteByProductCode as apiRemoveFavorite,
  updateCustomMeal as apiUpdateCustomMeal,
  updateCustomProduct as apiUpdateCustomProduct,
  updateFoodEntry as apiUpdateFoodEntry,
  writeDiaryDayCache,
} from "../features/nutrition/services/nutritionService";
import { useNutritionStore } from "../store/useNutritionStore";
import {
  NUTRITION_CUSTOM_MEALS_KEY,
  NUTRITION_CUSTOM_PRODUCTS_KEY,
  NUTRITION_DIARY_CACHE_KEY,
  NUTRITION_FAVORITES_KEY,
  NUTRITION_PRODUCTS_FIRST_PAGE_KEY,
  NUTRITION_RECENT_PRODUCTS_KEY,
} from "./nutritionOfflineKeys";
import {
  addToSyncQueue,
  filterSyncQueue,
  isOnline,
} from "./syncQueue";

function kickSync(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const autoSync = require("./autoSyncService") as {
      processSyncQueue?: () => Promise<unknown>;
    };
    if (typeof autoSync.processSyncQueue === "function") {
      void autoSync.processSyncQueue();
    }
  } catch (error) {
    console.warn("[OfflineNutrition] kickSync failed:", error);
  }
}

function emptyTotals(): DailyNutritionSummary["totals"] {
  return {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    sugar: 0,
    fiber: 0,
    sodium: 0,
  };
}

function computeTotals(
  entries: FoodEntryResponseDto[]
): DailyNutritionSummary["totals"] {
  return entries.reduce(
    (acc, e) => ({
      calories: acc.calories + (e.calories || 0),
      protein: acc.protein + (e.protein || 0),
      carbs: acc.carbs + (e.carbs || 0),
      fat: acc.fat + (e.fat || 0),
      sugar: acc.sugar + (e.sugar || 0),
      fiber: acc.fiber + (e.fiber || 0),
      sodium: acc.sodium + (e.sodium || 0),
    }),
    emptyTotals()
  );
}

function goalsFromStore(): DailyNutritionSummary["goals"] {
  const profile = useNutritionStore.getState().userProfile;
  return {
    dailyCalories: profile?.macroGoals?.dailyCalories ?? 0,
    protein: profile?.macroGoals?.protein ?? 0,
    carbs: profile?.macroGoals?.carbs ?? 0,
    fat: profile?.macroGoals?.fat ?? 0,
  };
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

async function readDiaryCache(): Promise<Record<string, DailyNutritionSummary>> {
  return readJson(NUTRITION_DIARY_CACHE_KEY, {});
}

async function ensureDiaryDay(date: string): Promise<DailyNutritionSummary> {
  const cache = await readDiaryCache();
  const existing = cache[date];
  if (existing) return existing;
  return {
    date,
    entries: [],
    totals: emptyTotals(),
    goals: goalsFromStore(),
    hasProfile: useNutritionStore.getState().hasProfile,
  };
}

async function persistDiaryDay(summary: DailyNutritionSummary): Promise<void> {
  await writeDiaryDayCache({
    ...summary,
    totals: computeTotals(summary.entries),
  });
}

async function touchRecentProduct(product: MappedProduct): Promise<void> {
  const recent = await readJson<MappedProduct[]>(NUTRITION_RECENT_PRODUCTS_KEY, []);
  const next = [
    product,
    ...recent.filter((p) => p.code !== product.code),
  ].slice(0, 40);
  await writeJson(NUTRITION_RECENT_PRODUCTS_KEY, next);
}

export async function findProductInLocalCaches(
  code: string
): Promise<MappedProduct | null> {
  const trimmed = code.trim();
  if (!trimmed) return null;

  const recent = await readJson<MappedProduct[]>(NUTRITION_RECENT_PRODUCTS_KEY, []);
  const fromRecent = recent.find((p) => p.code === trimmed);
  if (fromRecent) return fromRecent;

  try {
    const raw = await AsyncStorage.getItem(NUTRITION_PRODUCTS_FIRST_PAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { products?: MappedProduct[] };
      const hit = parsed.products?.find((p) => p.code === trimmed);
      if (hit) return hit;
    }
  } catch {
    // ignore
  }

  const customs = await readJson<CustomProductResponseDto[]>(
    NUTRITION_CUSTOM_PRODUCTS_KEY,
    []
  );
  const custom = customs.find(
    (p) => p.barcode === trimmed || p.id === trimmed
  );
  if (custom) {
    return {
      code: custom.barcode || custom.id,
      name: custom.name,
      brand: custom.brand ?? null,
      image: custom.image ?? null,
      categories: null,
      nutritionGrade: null,
      grams: custom.servingSize ?? 100,
      calories: custom.caloriesPer100,
      carbohydrates: custom.carbsPer100,
      protein: custom.proteinPer100,
      fat: custom.fatPer100,
      fiber: custom.fiberPer100 ?? null,
      sugar: custom.sugarPer100 ?? null,
      sodium: custom.sodiumPer100 ?? null,
      others: [],
    };
  }

  const favorites = await readJson<FavoriteProductResponseDto[]>(
    NUTRITION_FAVORITES_KEY,
    []
  );
  const fav = favorites.find((f) => f.productCode === trimmed);
  if (fav) {
    return {
      code: fav.productCode,
      name: fav.productName,
      brand: null,
      image: fav.productImage ?? null,
      categories: null,
      nutritionGrade: null,
      grams: 100,
      calories: fav.calories,
      carbohydrates: fav.carbs,
      protein: fav.protein,
      fat: fav.fat,
      fiber: null,
      sugar: null,
      sodium: null,
      others: [],
    };
  }

  return null;
}

export async function addFoodEntryOffline(
  entry: CreateFoodEntryDto & { id?: string }
): Promise<FoodEntryResponseDto> {
  const online = await isOnline();
  if (online) {
    try {
      const saved = await apiAddFoodEntry(entry);
      const day = await ensureDiaryDay(saved.date);
      await persistDiaryDay({
        ...day,
        entries: [...day.entries.filter((e) => e.id !== saved.id), saved],
      });
      kickSync();
      return saved;
    } catch {
      // fall through
    }
  }

  const userId = entry.userId || getCurrentUserId();
  const local: FoodEntryResponseDto = {
    ...entry,
    userId,
    id: entry.id ?? `local_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  const day = await ensureDiaryDay(local.date);
  await persistDiaryDay({
    ...day,
    entries: [...day.entries, local],
  });

  await addToSyncQueue("CREATE_FOOD_ENTRY", {
    ...entry,
    userId,
    id: local.id,
  });
  kickSync();
  return local;
}

export async function updateFoodEntryOffline(
  entryId: string,
  updates: UpdateFoodEntryDto
): Promise<FoodEntryResponseDto> {
  const online = await isOnline();
  if (online && !entryId.startsWith("local_")) {
    try {
      const saved = await apiUpdateFoodEntry(entryId, updates);
      const cache = await readDiaryCache();
      for (const date of Object.keys(cache)) {
        const day = cache[date];
        if (!day.entries.some((e) => e.id === entryId)) continue;
        await persistDiaryDay({
          ...day,
          entries: day.entries.map((e) =>
            e.id === entryId ? { ...e, ...saved } : e
          ),
        });
        break;
      }
      kickSync();
      return saved;
    } catch {
      // fall through
    }
  }

  const cache = await readDiaryCache();
  let updated: FoodEntryResponseDto | null = null;
  for (const date of Object.keys(cache)) {
    const day = cache[date];
    const idx = day.entries.findIndex((e) => e.id === entryId);
    if (idx < 0) continue;
    updated = { ...day.entries[idx], ...updates, id: entryId };
    const entries = day.entries.map((e, i) => (i === idx ? updated! : e));
    await persistDiaryDay({ ...day, entries });
    break;
  }

  if (!updated) {
    throw new Error(`Food entry ${entryId} not found in local diary cache`);
  }

  if (entryId.startsWith("local_")) {
    await filterSyncQueue((op) => {
      if (op.type !== "CREATE_FOOD_ENTRY") return true;
      return (op.payload as { id?: string }).id !== entryId;
    });
    await addToSyncQueue("CREATE_FOOD_ENTRY", {
      ...(updated as CreateFoodEntryDto),
      id: entryId,
    });
  } else {
    await addToSyncQueue("UPDATE_FOOD_ENTRY", { id: entryId, ...updates });
  }
  kickSync();
  return updated;
}

export async function deleteFoodEntryOffline(entryId: string): Promise<void> {
  const online = await isOnline();
  if (online && !entryId.startsWith("local_")) {
    try {
      await apiDeleteFoodEntry(entryId);
      await removeEntryFromDiaryCache(entryId);
      kickSync();
      return;
    } catch {
      // fall through
    }
  }

  await removeEntryFromDiaryCache(entryId);

  if (entryId.startsWith("local_")) {
    await filterSyncQueue((op) => {
      if (op.type === "CREATE_FOOD_ENTRY") {
        return (op.payload as { id?: string }).id !== entryId;
      }
      if (op.type === "UPDATE_FOOD_ENTRY" || op.type === "DELETE_FOOD_ENTRY") {
        return (op.payload as { id: string }).id !== entryId;
      }
      return true;
    });
  } else {
    await addToSyncQueue("DELETE_FOOD_ENTRY", { id: entryId });
  }
  kickSync();
}

async function removeEntryFromDiaryCache(entryId: string): Promise<void> {
  const cache = await readDiaryCache();
  for (const date of Object.keys(cache)) {
    const day = cache[date];
    if (!day.entries.some((e) => e.id === entryId)) continue;
    await persistDiaryDay({
      ...day,
      entries: day.entries.filter((e) => e.id !== entryId),
    });
    return;
  }
}

export async function createCustomProductOffline(
  product: CreateCustomProductDto & { id?: string }
): Promise<CustomProductResponseDto> {
  const online = await isOnline();
  if (online) {
    try {
      const saved = await apiCreateCustomProduct(product);
      await upsertListItem(NUTRITION_CUSTOM_PRODUCTS_KEY, saved);
      kickSync();
      return saved;
    } catch {
      // fall through
    }
  }

  const userId = product.userId || getCurrentUserId();
  const now = new Date().toISOString();
  const local: CustomProductResponseDto = {
    ...product,
    userId,
    id: product.id ?? `local_${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  };
  await upsertListItem(NUTRITION_CUSTOM_PRODUCTS_KEY, local);
  await addToSyncQueue("CREATE_CUSTOM_PRODUCT", { ...product, userId, id: local.id });
  kickSync();
  return local;
}

export async function updateCustomProductOffline(
  id: string,
  updates: UpdateCustomProductDto
): Promise<CustomProductResponseDto> {
  const online = await isOnline();
  if (online && !id.startsWith("local_")) {
    try {
      const saved = await apiUpdateCustomProduct(id, updates);
      await upsertListItem(NUTRITION_CUSTOM_PRODUCTS_KEY, saved);
      kickSync();
      return saved;
    } catch {
      // fall through
    }
  }

  const list = await readJson<CustomProductResponseDto[]>(
    NUTRITION_CUSTOM_PRODUCTS_KEY,
    []
  );
  const prev = list.find((p) => p.id === id);
  if (!prev) throw new Error(`Custom product ${id} not found locally`);
  const updated: CustomProductResponseDto = {
    ...prev,
    ...updates,
    id,
    updatedAt: new Date().toISOString(),
  };
  await upsertListItem(NUTRITION_CUSTOM_PRODUCTS_KEY, updated);
  await addToSyncQueue("UPDATE_CUSTOM_PRODUCT", { id, ...updates });
  kickSync();
  return updated;
}

export async function deleteCustomProductOffline(id: string): Promise<void> {
  const online = await isOnline();
  if (online && !id.startsWith("local_")) {
    try {
      await apiDeleteCustomProduct(id);
      await removeListItem(NUTRITION_CUSTOM_PRODUCTS_KEY, id);
      kickSync();
      return;
    } catch {
      // fall through
    }
  }

  await removeListItem(NUTRITION_CUSTOM_PRODUCTS_KEY, id);
  if (id.startsWith("local_")) {
    await filterSyncQueue((op) => {
      if (
        op.type === "CREATE_CUSTOM_PRODUCT" ||
        op.type === "UPDATE_CUSTOM_PRODUCT" ||
        op.type === "DELETE_CUSTOM_PRODUCT"
      ) {
        return (op.payload as { id?: string }).id !== id;
      }
      return true;
    });
  } else {
    await addToSyncQueue("DELETE_CUSTOM_PRODUCT", { id });
  }
  kickSync();
}

export async function createCustomMealOffline(
  meal: CreateCustomMealDto & { id?: string }
): Promise<CustomMealResponseDto> {
  const online = await isOnline();
  if (online) {
    try {
      const saved = await apiCreateCustomMeal(meal);
      await upsertListItem(NUTRITION_CUSTOM_MEALS_KEY, saved);
      kickSync();
      return saved;
    } catch {
      // fall through
    }
  }

  const userId = meal.userId || getCurrentUserId();
  const now = new Date().toISOString();
  const totals = meal.products.reduce(
    (acc, p) => ({
      calories: acc.calories + p.calories,
      protein: acc.protein + p.protein,
      carbs: acc.carbs + p.carbs,
      fat: acc.fat + p.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  const local: CustomMealResponseDto = {
    id: meal.id ?? `local_${Date.now()}`,
    userId,
    name: meal.name,
    description: meal.description,
    image: meal.image ?? undefined,
    products: meal.products,
    totalCalories: totals.calories,
    totalProtein: totals.protein,
    totalCarbs: totals.carbs,
    totalFat: totals.fat,
    createdAt: now,
    updatedAt: now,
  };
  await upsertListItem(NUTRITION_CUSTOM_MEALS_KEY, local);
  await addToSyncQueue("CREATE_CUSTOM_MEAL", { ...meal, userId, id: local.id });
  kickSync();
  return local;
}

export async function updateCustomMealOffline(
  id: string,
  updates: UpdateCustomMealDto
): Promise<CustomMealResponseDto> {
  const online = await isOnline();
  if (online && !id.startsWith("local_")) {
    try {
      const saved = await apiUpdateCustomMeal(id, updates);
      await upsertListItem(NUTRITION_CUSTOM_MEALS_KEY, saved);
      kickSync();
      return saved;
    } catch {
      // fall through
    }
  }

  const list = await readJson<CustomMealResponseDto[]>(
    NUTRITION_CUSTOM_MEALS_KEY,
    []
  );
  const prev = list.find((m) => m.id === id);
  if (!prev) throw new Error(`Custom meal ${id} not found locally`);
  const products = updates.products ?? prev.products;
  const totals = products.reduce(
    (acc, p) => ({
      calories: acc.calories + p.calories,
      protein: acc.protein + p.protein,
      carbs: acc.carbs + p.carbs,
      fat: acc.fat + p.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  const updated: CustomMealResponseDto = {
    ...prev,
    ...updates,
    id,
    products,
    totalCalories: totals.calories,
    totalProtein: totals.protein,
    totalCarbs: totals.carbs,
    totalFat: totals.fat,
    image:
      updates.image === null
        ? undefined
        : (updates.image ?? prev.image),
    updatedAt: new Date().toISOString(),
  };
  await upsertListItem(NUTRITION_CUSTOM_MEALS_KEY, updated);
  await addToSyncQueue("UPDATE_CUSTOM_MEAL", { id, ...updates });
  kickSync();
  return updated;
}

export async function deleteCustomMealOffline(id: string): Promise<void> {
  const online = await isOnline();
  if (online && !id.startsWith("local_")) {
    try {
      await apiDeleteCustomMeal(id);
      await removeListItem(NUTRITION_CUSTOM_MEALS_KEY, id);
      kickSync();
      return;
    } catch {
      // fall through
    }
  }

  await removeListItem(NUTRITION_CUSTOM_MEALS_KEY, id);
  if (id.startsWith("local_")) {
    await filterSyncQueue((op) => {
      if (
        op.type === "CREATE_CUSTOM_MEAL" ||
        op.type === "UPDATE_CUSTOM_MEAL" ||
        op.type === "DELETE_CUSTOM_MEAL"
      ) {
        return (op.payload as { id?: string }).id !== id;
      }
      return true;
    });
  } else {
    await addToSyncQueue("DELETE_CUSTOM_MEAL", { id });
  }
  kickSync();
}

export async function addFavoriteOffline(
  favorite: Omit<FavoriteProductResponseDto, "id" | "createdAt"> & {
    id?: string;
  }
): Promise<FavoriteProductResponseDto> {
  const online = await isOnline();
  if (online) {
    try {
      const saved = await apiAddFavorite(favorite);
      await upsertListItem(NUTRITION_FAVORITES_KEY, saved, "productCode");
      kickSync();
      return saved;
    } catch {
      // fall through
    }
  }

  const userId = favorite.userId || getCurrentUserId();
  const local: FavoriteProductResponseDto = {
    ...favorite,
    userId,
    id: favorite.id ?? `local_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  await upsertListItem(NUTRITION_FAVORITES_KEY, local, "productCode");
  await addToSyncQueue("ADD_FAVORITE", { ...favorite, userId, id: local.id });
  kickSync();
  return local;
}

export async function removeFavoriteOffline(
  productCode: string
): Promise<void> {
  const online = await isOnline();
  if (online) {
    try {
      await apiRemoveFavorite(productCode);
      await removeFavoriteFromCache(productCode);
      kickSync();
      return;
    } catch {
      // fall through
    }
  }

  await removeFavoriteFromCache(productCode);
  await filterSyncQueue((op) => {
    if (op.type === "ADD_FAVORITE") {
      return (op.payload as { productCode: string }).productCode !== productCode;
    }
    return true;
  });
  await addToSyncQueue("REMOVE_FAVORITE", { productCode });
  kickSync();
}

async function removeFavoriteFromCache(productCode: string): Promise<void> {
  const list = await readJson<FavoriteProductResponseDto[]>(
    NUTRITION_FAVORITES_KEY,
    []
  );
  await writeJson(
    NUTRITION_FAVORITES_KEY,
    list.filter((f) => f.productCode !== productCode)
  );
}

async function upsertListItem<T extends { id: string }>(
  key: string,
  item: T,
  uniqueBy: "id" | "productCode" = "id"
): Promise<void> {
  const list = await readJson<T[]>(key, []);
  const next =
    uniqueBy === "productCode" && "productCode" in item
      ? [
          item,
          ...list.filter(
            (x) =>
              (x as { productCode?: string }).productCode !==
              (item as { productCode: string }).productCode
          ),
        ]
      : [item, ...list.filter((x) => x.id !== item.id)];
  await writeJson(key, next);
}

async function removeListItem(key: string, id: string): Promise<void> {
  const list = await readJson<{ id: string }[]>(key, []);
  await writeJson(
    key,
    list.filter((x) => x.id !== id)
  );
}

/** Remember a catalog product for offline barcode / re-add. */
export async function rememberRecentProduct(
  product: MappedProduct
): Promise<void> {
  if (!product?.code) return;
  await touchRecentProduct(product);
}
