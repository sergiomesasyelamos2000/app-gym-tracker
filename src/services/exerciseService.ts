import AsyncStorage from "@react-native-async-storage/async-storage";
import { ApiError, apiFetch } from "../api/client";
import { ENV } from "../environments/environment";
import type {
  CreateExerciseDto,
  EquipmentDto,
  ExerciseRequestDto,
  ExerciseTypeDto,
  MuscleDto,
} from "@sergiomesasyelamos2000/shared";
import type { CaughtError } from "../types";
import {
  filterAndSortExercises,
  type SearchableExercise,
} from "../features/routine/utils/exerciseSearch";
import { clearExerciseImageLookupCache } from "../features/routine/utils/exerciseImageLookupCache";
import { warmExerciseCatalogThumbs } from "../features/routine/utils/prefetchExerciseThumbs";
import {
  EXERCISE_CACHE_KEY,
  EXERCISE_CATALOG_TTL_MS,
  applyNetworkExerciseCatalog,
  clearExerciseCatalogStorage,
  getCatalogWriteGeneration,
  isExerciseCatalogFromOfflineCache,
  isExerciseCatalogStale,
  markExerciseCatalogOffline,
  peekExerciseCatalog,
  peekExerciseCatalogSnapshot,
  readExerciseCatalog,
  upsertExerciseInCatalog,
} from "./exerciseCatalogCache";

export {
  peekExerciseCatalog,
  invalidateExerciseCatalogMemory,
} from "./exerciseCatalogCache";

type ExerciseSearchFilters = {
  name?: string;
  equipment?: string;
  muscle?: string;
  muscles?: string[] | string;
};

const CACHE_KEYS = {
  EQUIPMENT: "@equipment_cache",
  EXERCISE_TYPES: "@exercise_types_cache",
  MUSCLES: "@muscles_cache",
  LAST_SYNC: "@exercises_last_sync",
  API_URL: "@exercises_cache_api_url",
};

const AUX_CACHE_KEYS = [
  CACHE_KEYS.EQUIPMENT,
  CACHE_KEYS.EXERCISE_TYPES,
  CACHE_KEYS.MUSCLES,
];

const isStorageFullError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error || "");
  const normalized = message.toLowerCase();
  return (
    normalized.includes("sqlite_full") ||
    normalized.includes("database or disk is full") ||
    normalized.includes("code 13")
  );
};

let hasLoggedStorageFullWarning = false;
let inFlightCatalogPrefetch: Promise<void> | null = null;

const isNetworkError = (error: unknown): boolean => {
  if (error instanceof ApiError) return false;
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error || "");

  return (
    message.includes("network request failed") ||
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("timeout") ||
    message.includes("timed out")
  );
};

const canUseStaleExerciseCache = (error: unknown): boolean => {
  if (isNetworkError(error)) return true;
  if (error instanceof ApiError && (error.status ?? 0) >= 500) return true;
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error || "");
  return (
    message.includes("suspendido") ||
    message.includes("no está disponible")
  );
};

const normalizeApiUrl = (value: string) =>
  value.trim().replace(/\/+$/, "").toLowerCase();

async function isCacheFromCurrentApi(): Promise<boolean> {
  const stored = await AsyncStorage.getItem(CACHE_KEYS.API_URL);
  if (!stored) return false;
  return normalizeApiUrl(stored) === normalizeApiUrl(ENV.API_URL);
}

async function safeSetItem(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (error) {
    if (isStorageFullError(error)) {
      if (!hasLoggedStorageFullWarning) {
        hasLoggedStorageFullWarning = true;
        console.warn(
          "[ExerciseService] AsyncStorage lleno. Se omite la escritura de cache temporalmente."
        );
      }
      try {
        await AsyncStorage.multiRemove(AUX_CACHE_KEYS);
        await AsyncStorage.setItem(key, value);
      } catch {
        // Best-effort: do not break the main flow for cache writes.
      }
      return;
    }
    console.warn(
      `[ExerciseService] No se pudo guardar cache para ${key}:`,
      error
    );
  }
}

async function getCachedJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function persistCatalogFromNetwork(
  exercises: ExerciseRequestDto[],
  generationAtFetchStart: number
): Promise<void> {
  await applyNetworkExerciseCatalog(exercises, generationAtFetchStart);
  clearExerciseImageLookupCache();
  warmExerciseCatalogThumbs();
}

async function refreshExercisesCacheInBackground(): Promise<void> {
  const generationAtFetchStart = getCatalogWriteGeneration();
  try {
    const freshData = await apiFetch<ExerciseRequestDto[]>("exercises");
    await persistCatalogFromNetwork(freshData, generationAtFetchStart);
  } catch {
    // Best-effort refresh, ignore failures.
  }
}

function revalidateExercisesIfStale(): void {
  if (!isExerciseCatalogStale()) return;
  void refreshExercisesCacheInBackground();
}

/**
 * Fetch exercises with cache-first strategy:
 * 1. Return memory immediately when available
 * 2. Fall back to AsyncStorage (v4 / migrated v3)
 * 3. Refresh in background when stale
 * 4. If no cache, fetch from backend
 */
export const fetchExercises = async (): Promise<ExerciseRequestDto[]> => {
  const memoryHit = peekExerciseCatalog();
  if (memoryHit?.length) {
    await markExerciseCatalogOffline(false);
    revalidateExercisesIfStale();
    return memoryHit;
  }

  const stored = await readExerciseCatalog();
  if (stored?.exercises.length) {
    await markExerciseCatalogOffline(false);
    revalidateExercisesIfStale();
    return stored.exercises;
  }

  try {
    const generationAtFetchStart = getCatalogWriteGeneration();
    const data = await apiFetch<ExerciseRequestDto[]>("exercises");
    await persistCatalogFromNetwork(data, generationAtFetchStart);
    return data;
  } catch (error: CaughtError) {
    if (!canUseStaleExerciseCache(error)) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "No se pudieron cargar los ejercicios.";
      throw new Error(message);
    }

    try {
      const stale = await readExerciseCatalog();
      if (stale?.exercises.length) {
        await markExerciseCatalogOffline(true);
        return stale.exercises;
      }

      // Last resort: raw v4 key in case memory was cleared mid-flight.
      const cached = await AsyncStorage.getItem(EXERCISE_CACHE_KEY);
      if (cached) {
        const exercises = JSON.parse(cached) as ExerciseRequestDto[];
        await markExerciseCatalogOffline(true);
        return exercises;
      }
    } catch (cacheError) {
      console.error("[ExerciseService] Cache read failed:", cacheError);
    }

    const message =
      error instanceof Error && error.message
        ? error.message
        : "No se pudieron cargar los ejercicios.";
    throw new Error(message);
  }
};

async function runCatalogPrefetch(force: boolean): Promise<void> {
  if (!force) {
    const snapshot = peekExerciseCatalogSnapshot();
    if (snapshot && !isExerciseCatalogStale()) {
      warmExerciseCatalogThumbs();
      return;
    }
    // Ensure storage-backed freshness check when memory is empty.
    if (!snapshot) {
      const stored = await readExerciseCatalog();
      if (stored && !isExerciseCatalogStale()) {
        warmExerciseCatalogThumbs();
        return;
      }
    }
  }

  const generationAtFetchStart = getCatalogWriteGeneration();
  const [exercises, equipment, muscles] = await Promise.all([
    apiFetch<ExerciseRequestDto[]>("exercises"),
    apiFetch<EquipmentDto[]>("exercises/equipment/all"),
    apiFetch<MuscleDto[]>("exercises/muscles/all"),
  ]);

  await Promise.all([
    persistCatalogFromNetwork(exercises, generationAtFetchStart),
    safeSetItem(CACHE_KEYS.EQUIPMENT, JSON.stringify(equipment)),
    safeSetItem(CACHE_KEYS.MUSCLES, JSON.stringify(muscles)),
  ]);
}

/**
 * Warm-up catalog data after login/app boot.
 * Soft path respects 24h TTL; force bypasses it (login/register only).
 */
export const prefetchExerciseCatalog = async (options?: {
  force?: boolean;
}): Promise<void> => {
  const force = options?.force === true;

  if (inFlightCatalogPrefetch) {
    if (!force) {
      return inFlightCatalogPrefetch;
    }
    await inFlightCatalogPrefetch;
  }

  inFlightCatalogPrefetch = (async () => {
    try {
      await runCatalogPrefetch(force);
    } catch {
      // Best-effort prefetch. Existing cache continues to be used.
    } finally {
      inFlightCatalogPrefetch = null;
    }
  })();

  return inFlightCatalogPrefetch;
};

/**
 * Check if last fetch was from cache (offline mode)
 */
export const isUsingCache = async (): Promise<boolean> => {
  return isExerciseCatalogFromOfflineCache();
};

export const searchExercises = async (
  filters: ExerciseSearchFilters
): Promise<ExerciseRequestDto[]> => {
  const name = filters.name?.trim() || "";
  const equipment = filters.equipment?.trim() || "";
  const musclesInput =
    typeof filters.muscles === "string"
      ? filters.muscles
      : Array.isArray(filters.muscles)
        ? filters.muscles.join(",")
        : "";
  const muscle = filters.muscle?.trim() || "";
  const muscles = (musclesInput || muscle)
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  const params = new URLSearchParams();
  if (name) params.append("name", name);
  if (equipment) params.append("equipment", equipment);
  if (muscles.length > 0) params.append("muscles", muscles.join(","));

  try {
    const endpoint = params.toString()
      ? `exercises/search?${params.toString()}`
      : "exercises/search";

    const data = await apiFetch<ExerciseRequestDto[]>(endpoint);
    return data;
  } catch (error) {
    const memoryHit = peekExerciseCatalog();
    if (memoryHit?.length) {
      await markExerciseCatalogOffline(true);
      return filterAndSortExercises(memoryHit as SearchableExercise[], {
        searchQuery: name,
        selectedEquipmentNames: equipment ? [equipment] : [],
        selectedMuscleNames: muscles,
      });
    }

    const stored = await readExerciseCatalog();
    if (stored?.exercises.length) {
      await markExerciseCatalogOffline(true);
      return filterAndSortExercises(stored.exercises as SearchableExercise[], {
        searchQuery: name,
        selectedEquipmentNames: equipment ? [equipment] : [],
        selectedMuscleNames: muscles,
      });
    }
    throw error;
  }
};

export const createExercise = async (
  exercise: CreateExerciseDto
): Promise<ExerciseRequestDto> => {
  const created = await apiFetch<ExerciseRequestDto>("exercises", {
    method: "POST",
    body: JSON.stringify(exercise),
    headers: {
      "Content-Type": "application/json",
    },
  });
  upsertExerciseInCatalog(created);
  clearExerciseImageLookupCache();
  return created;
};

export const fetchEquipment = async (): Promise<EquipmentDto[]> => {
  const cacheMatchesCurrentApi = await isCacheFromCurrentApi();
  if (cacheMatchesCurrentApi) {
    const cached = await getCachedJson<EquipmentDto[]>(CACHE_KEYS.EQUIPMENT);
    if (cached && cached.length > 0) {
      if (isExerciseCatalogStale()) {
        void (async () => {
          try {
            const fresh = await apiFetch<EquipmentDto[]>(
              "exercises/equipment/all"
            );
            await safeSetItem(CACHE_KEYS.EQUIPMENT, JSON.stringify(fresh));
          } catch {
            // Best effort
          }
        })();
      }
      return cached;
    }
  }

  try {
    const data = await apiFetch<EquipmentDto[]>("exercises/equipment/all");
    await safeSetItem(CACHE_KEYS.EQUIPMENT, JSON.stringify(data));
    return data;
  } catch (error) {
    const cached = await AsyncStorage.getItem(CACHE_KEYS.EQUIPMENT);
    if (cached) {
      return JSON.parse(cached);
    }
    throw error;
  }
};

export const fetchExerciseTypes = async (): Promise<ExerciseTypeDto[]> => {
  try {
    const data = await apiFetch<ExerciseTypeDto[]>(
      "exercises/exercise-types/all"
    );
    await safeSetItem(CACHE_KEYS.EXERCISE_TYPES, JSON.stringify(data));
    return data;
  } catch (error) {
    const cached = await AsyncStorage.getItem(CACHE_KEYS.EXERCISE_TYPES);
    if (cached) {
      return JSON.parse(cached);
    }
    throw error;
  }
};

export const fetchMuscles = async (): Promise<MuscleDto[]> => {
  const cacheMatchesCurrentApi = await isCacheFromCurrentApi();
  if (cacheMatchesCurrentApi) {
    const cached = await getCachedJson<MuscleDto[]>(CACHE_KEYS.MUSCLES);
    if (cached && cached.length > 0) {
      if (isExerciseCatalogStale()) {
        void (async () => {
          try {
            const fresh = await apiFetch<MuscleDto[]>("exercises/muscles/all");
            await safeSetItem(CACHE_KEYS.MUSCLES, JSON.stringify(fresh));
          } catch {
            // Best effort
          }
        })();
      }
      return cached;
    }
  }

  try {
    const data = await apiFetch<MuscleDto[]>("exercises/muscles/all");
    await safeSetItem(CACHE_KEYS.MUSCLES, JSON.stringify(data));
    return data;
  } catch (error) {
    const cached = await AsyncStorage.getItem(CACHE_KEYS.MUSCLES);
    if (cached) {
      return JSON.parse(cached);
    }
    throw error;
  }
};

/** @internal exposed for tests / logout cleanup */
export async function resetExerciseCatalogCaches(): Promise<void> {
  await clearExerciseCatalogStorage();
  await AsyncStorage.multiRemove(AUX_CACHE_KEYS);
}

// Keep TTL constant exported for callers that need the same window.
export { EXERCISE_CATALOG_TTL_MS };
