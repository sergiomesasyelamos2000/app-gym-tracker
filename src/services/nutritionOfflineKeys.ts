/**
 * AsyncStorage keys for nutrition offline SoT (Hevy-style, parallel to routines).
 * Do not use SQLite nutritionOfflineService for new work.
 */

export const NUTRITION_DIARY_CACHE_KEY = "@nutrition_diary_cache_v1";
export const NUTRITION_CUSTOM_PRODUCTS_KEY = "@nutrition_custom_products_v1";
export const NUTRITION_CUSTOM_MEALS_KEY = "@nutrition_custom_meals_v1";
export const NUTRITION_FAVORITES_KEY = "@nutrition_favorites_v1";
export const NUTRITION_RECENT_PRODUCTS_KEY = "@nutrition_recent_products_v1";
export const NUTRITION_ID_MAPPING_KEY = "@nutrition_id_mapping";

/** Existing first-page popular catalog cache (nutritionService). */
export const NUTRITION_PRODUCTS_FIRST_PAGE_KEY =
  "@nutrition_products_first_page_cache_v1";
export const NUTRITION_PRODUCTS_FIRST_PAGE_SYNC_KEY =
  "@nutrition_products_first_page_last_sync_v1";

/** Exact keys purged on logout (nutrition domain). */
export const NUTRITION_OFFLINE_EXACT_KEYS = [
  NUTRITION_DIARY_CACHE_KEY,
  NUTRITION_CUSTOM_PRODUCTS_KEY,
  NUTRITION_CUSTOM_MEALS_KEY,
  NUTRITION_FAVORITES_KEY,
  NUTRITION_RECENT_PRODUCTS_KEY,
  NUTRITION_ID_MAPPING_KEY,
  NUTRITION_PRODUCTS_FIRST_PAGE_KEY,
  NUTRITION_PRODUCTS_FIRST_PAGE_SYNC_KEY,
] as const;

export function isNutritionOfflinePrefixedKey(key: string): boolean {
  return key.startsWith("@nutrition_");
}
