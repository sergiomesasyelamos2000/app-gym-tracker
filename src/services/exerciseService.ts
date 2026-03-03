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

type ExerciseSearchFilters = {
  name?: string;
  equipment?: string;
  muscle?: string;
};

type SearchableExercise = ExerciseRequestDto & {
  equipments?: string[];
  targetMuscles?: string[];
  secondaryMuscles?: string[];
  bodyParts?: string[];
};

const CACHE_KEYS = {
  EXERCISES: "@exercises_cache",
  EQUIPMENT: "@equipment_cache",
  EXERCISE_TYPES: "@exercise_types_cache",
  MUSCLES: "@muscles_cache",
  LAST_SYNC: "@exercises_last_sync",
  API_URL: "@exercises_cache_api_url",
};

const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

const EXERCISE_CACHE_KEYS = [
  CACHE_KEYS.EXERCISES,
  CACHE_KEYS.EQUIPMENT,
  CACHE_KEYS.EXERCISE_TYPES,
  CACHE_KEYS.MUSCLES,
  CACHE_KEYS.LAST_SYNC,
  CACHE_KEYS.API_URL,
  `${CACHE_KEYS.EXERCISES}_from_cache`,
];

const isStorageFullError = (error: unknown): boolean => {
  const message =
    error instanceof Error ? error.message : String(error || "");
  const normalized = message.toLowerCase();
  return (
    normalized.includes("sqlite_full") ||
    normalized.includes("database or disk is full") ||
    normalized.includes("code 13")
  );
};

let hasLoggedStorageFullWarning = false;

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

const normalizeApiUrl = (value: string) =>
  value.trim().replace(/\/+$/, "").toLowerCase();

async function markCacheApiUrl(): Promise<void> {
  await safeSetItem(CACHE_KEYS.API_URL, normalizeApiUrl(ENV.API_URL));
}

async function isCacheFromCurrentApi(): Promise<boolean> {
  const stored = await AsyncStorage.getItem(CACHE_KEYS.API_URL);
  if (!stored) return false;
  return normalizeApiUrl(stored) === normalizeApiUrl(ENV.API_URL);
}

async function clearExerciseCatalogCache(): Promise<void> {
  await AsyncStorage.multiRemove(EXERCISE_CACHE_KEYS);
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
      // Intento best-effort de liberar únicamente cache del catálogo.
      try {
        await AsyncStorage.multiRemove(EXERCISE_CACHE_KEYS);
        await AsyncStorage.setItem(key, value);
      } catch {
        // Mantener comportamiento resiliente: no romper el flujo por cache.
      }
      return;
    }
    // Otros errores de storage no deben romper el flujo principal.
    console.warn(
      `[ExerciseService] No se pudo guardar cache para ${key}:`,
      error
    );
  }
}

async function refreshExercisesCacheInBackground(): Promise<void> {
  try {
    const freshData = await apiFetch<ExerciseRequestDto[]>("exercises");
    await safeSetItem(CACHE_KEYS.EXERCISES, JSON.stringify(freshData));
    await safeSetItem(CACHE_KEYS.LAST_SYNC, Date.now().toString());
    await safeSetItem(`${CACHE_KEYS.EXERCISES}_from_cache`, "false");
  } catch {
    // Best-effort refresh, ignore failures.
  }
}

async function getLastSyncTimestamp(): Promise<number | null> {
  const value = await AsyncStorage.getItem(CACHE_KEYS.LAST_SYNC);
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

async function shouldRevalidate(
  maxAgeMs: number = CACHE_EXPIRY_MS
): Promise<boolean> {
  const lastSync = await getLastSyncTimestamp();
  if (!lastSync) return true;
  return Date.now() - lastSync > maxAgeMs;
}

/**
 * Check if cache is still valid
 */
async function isCacheValid(key: string): Promise<boolean> {
  try {
    const lastSync = await AsyncStorage.getItem(CACHE_KEYS.LAST_SYNC);
    if (!lastSync) return false;

    const timeSinceSync = Date.now() - parseInt(lastSync, 10);
    return timeSinceSync < CACHE_EXPIRY_MS;
  } catch {
    return false;
  }
}

/**
 * Fetch exercises with network-first strategy
 * 1. Try backend first (source of truth)
 * 2. If backend fails, fallback to cache
 */
export const fetchExercises = async (): Promise<ExerciseRequestDto[]> => {
  try {
    const data = await apiFetch<ExerciseRequestDto[]>("exercises");

    await safeSetItem(CACHE_KEYS.EXERCISES, JSON.stringify(data));
    await safeSetItem(CACHE_KEYS.LAST_SYNC, Date.now().toString());
    await safeSetItem(`${CACHE_KEYS.EXERCISES}_from_cache`, "false");
    await markCacheApiUrl();

    return data;
  } catch (error: CaughtError) {
    // Only fallback to cache when the error is an actual network failure.
    // For API errors (401/403/500/etc), surface the error to avoid stale data.
    if (!isNetworkError(error)) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "No se pudieron cargar los ejercicios.";
      throw new Error(message);
    }

    try {
      const cacheMatchesCurrentApi = await isCacheFromCurrentApi();
      if (!cacheMatchesCurrentApi) {
        await clearExerciseCatalogCache();
        throw new Error("Cache de ejercicios invalido para la API actual.");
      }

      const cached = await AsyncStorage.getItem(CACHE_KEYS.EXERCISES);
      if (cached) {
        const exercises = JSON.parse(cached);
        await safeSetItem(
          `${CACHE_KEYS.EXERCISES}_from_cache`,
          "true"
        );
        return exercises;
      }
    } catch (cacheError) {
      console.error("[ExerciseService] Cache read failed:", cacheError);
    }

    // If both network and cache fail, surface a controlled error so UI can show retry state.
    const message =
      error instanceof Error && error.message
        ? error.message
        : "No se pudieron cargar los ejercicios.";
    throw new Error(message);
  }
};

/**
 * Warm-up catalog data after login/app boot:
 * refreshes exercises + filters and leaves everything cached.
 */
export const prefetchExerciseCatalog = async (
  options?: { force?: boolean }
): Promise<void> => {
  try {
    const force = options?.force === true;
    if (!force && !(await shouldRevalidate())) {
      return;
    }

    const [exercises, equipment, muscles] = await Promise.all([
      apiFetch<ExerciseRequestDto[]>("exercises"),
      apiFetch<EquipmentDto[]>("exercises/equipment/all"),
      apiFetch<MuscleDto[]>("exercises/muscles/all"),
    ]);

    await Promise.all([
      safeSetItem(CACHE_KEYS.EXERCISES, JSON.stringify(exercises)),
      safeSetItem(CACHE_KEYS.EQUIPMENT, JSON.stringify(equipment)),
      safeSetItem(CACHE_KEYS.MUSCLES, JSON.stringify(muscles)),
      safeSetItem(CACHE_KEYS.LAST_SYNC, Date.now().toString()),
      safeSetItem(`${CACHE_KEYS.EXERCISES}_from_cache`, "false"),
      markCacheApiUrl(),
    ]);
  } catch {
    // Best-effort prefetch. Existing cache continues to be used.
  }
};

/**
 * Check if last fetch was from cache (offline mode)
 */
export const isUsingCache = async (): Promise<boolean> => {
  try {
    const fromCache = await AsyncStorage.getItem(
      `${CACHE_KEYS.EXERCISES}_from_cache`
    );
    return fromCache === "true";
  } catch {
    return false;
  }
};

export const searchExercises = async (
  filters: ExerciseSearchFilters
): Promise<ExerciseRequestDto[]> => {
  const name = filters.name?.trim() || "";
  const equipment = filters.equipment?.trim() || "";
  const muscle = filters.muscle?.trim() || "";

  const params = new URLSearchParams();
  if (name) params.append("name", name);
  if (equipment) params.append("equipment", equipment);
  if (muscle) params.append("muscle", muscle);

  try {
    const endpoint = params.toString()
      ? `exercises/search?${params.toString()}`
      : "exercises/search";

    const data = await apiFetch<ExerciseRequestDto[]>(endpoint);
    return data;
  } catch (error) {
    // Fallback to local filtering if offline
    const cached = await AsyncStorage.getItem(CACHE_KEYS.EXERCISES);
    if (cached) {
      const exercises: SearchableExercise[] = JSON.parse(cached);
      const lowerName = name.toLowerCase();
      const lowerEquipment = equipment.toLowerCase();
      const lowerMuscle = muscle.toLowerCase();

      await safeSetItem(`${CACHE_KEYS.EXERCISES}_from_cache`, "true");

      return exercises.filter((ex) => {
        const matchesName =
          !lowerName || ex.name.toLowerCase().includes(lowerName);
        const exerciseEquipments = ex.equipments || [];
        const exerciseMuscles = [
          ...(ex.targetMuscles || []),
          ...(ex.secondaryMuscles || []),
          ...(ex.bodyParts || []),
        ];
        const matchesEquipment =
          !lowerEquipment ||
          exerciseEquipments.some((item) => {
            const token = item.toLowerCase().trim();
            return token === lowerEquipment || token.startsWith(`${lowerEquipment} `);
          });
        const matchesMuscle =
          !lowerMuscle ||
          exerciseMuscles.some((item) => {
            const token = item.toLowerCase().trim();
            return token === lowerMuscle || token.startsWith(`${lowerMuscle} `);
          });

        return matchesName && matchesEquipment && matchesMuscle;
      });
    }
    throw error;
  }
};

export const createExercise = async (
  exercise: CreateExerciseDto
): Promise<ExerciseRequestDto> => {
  return apiFetch<ExerciseRequestDto>("exercises", {
    method: "POST",
    body: JSON.stringify(exercise),
    headers: {
      "Content-Type": "application/json",
    },
  });
};

export const fetchEquipment = async (): Promise<EquipmentDto[]> => {
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
