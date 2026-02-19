import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch } from "../api/client";
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
};

const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

async function refreshExercisesCacheInBackground(): Promise<void> {
  try {
    const freshData = await apiFetch<ExerciseRequestDto[]>("exercises");
    await AsyncStorage.setItem(CACHE_KEYS.EXERCISES, JSON.stringify(freshData));
    await AsyncStorage.setItem(CACHE_KEYS.LAST_SYNC, Date.now().toString());
    await AsyncStorage.setItem(`${CACHE_KEYS.EXERCISES}_from_cache`, "false");
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
 * Fetch exercises with offline-first strategy
 * 1. Try to load from cache immediately
 * 2. If online, fetch from backend and update cache
 * 3. If offline, use cached data
 */
export const fetchExercises = async (): Promise<ExerciseRequestDto[]> => {
  const cached = await AsyncStorage.getItem(CACHE_KEYS.EXERCISES);
  if (cached) {
    const cachedExercises = JSON.parse(cached) as ExerciseRequestDto[];
    // Cache-first strategy: this is not necessarily offline mode.
    await AsyncStorage.setItem(`${CACHE_KEYS.EXERCISES}_from_cache`, "false");
    if (await shouldRevalidate()) {
      void refreshExercisesCacheInBackground();
    }
    return cachedExercises;
  }

  try {
    const data = await apiFetch<ExerciseRequestDto[]>("exercises");

    await AsyncStorage.setItem(CACHE_KEYS.EXERCISES, JSON.stringify(data));
    await AsyncStorage.setItem(CACHE_KEYS.LAST_SYNC, Date.now().toString());
    await AsyncStorage.setItem(`${CACHE_KEYS.EXERCISES}_from_cache`, "false");

    return data;
  } catch (error: CaughtError) {
    // If network fails, try to load from cache

    try {
      const cached = await AsyncStorage.getItem(CACHE_KEYS.EXERCISES);
      if (cached) {
        const exercises = JSON.parse(cached);
        await AsyncStorage.setItem(
          `${CACHE_KEYS.EXERCISES}_from_cache`,
          "true"
        );
        return exercises;
      }
    } catch (cacheError) {
      console.error("[ExerciseService] Cache read failed:", cacheError);
    }

    // If both fail, throw the original error
    console.error("[ExerciseService] No cached data available");
    throw new Error(
      "No se pudieron cargar los ejercicios. Por favor, conecta a internet al menos una vez."
    );
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
      AsyncStorage.setItem(CACHE_KEYS.EXERCISES, JSON.stringify(exercises)),
      AsyncStorage.setItem(CACHE_KEYS.EQUIPMENT, JSON.stringify(equipment)),
      AsyncStorage.setItem(CACHE_KEYS.MUSCLES, JSON.stringify(muscles)),
      AsyncStorage.setItem(CACHE_KEYS.LAST_SYNC, Date.now().toString()),
      AsyncStorage.setItem(`${CACHE_KEYS.EXERCISES}_from_cache`, "false"),
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

      await AsyncStorage.setItem(`${CACHE_KEYS.EXERCISES}_from_cache`, "true");

      return exercises.filter((ex) => {
        const matchesName =
          !lowerName || ex.name.toLowerCase().includes(lowerName);
        const exerciseEquipments = ex.equipments || [];
        const exerciseMuscles = [
          ...(ex.targetMuscles || []),
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
    await AsyncStorage.setItem(CACHE_KEYS.EQUIPMENT, JSON.stringify(data));
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
    await AsyncStorage.setItem(CACHE_KEYS.EXERCISE_TYPES, JSON.stringify(data));
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
    await AsyncStorage.setItem(CACHE_KEYS.MUSCLES, JSON.stringify(data));
    return data;
  } catch (error) {
    const cached = await AsyncStorage.getItem(CACHE_KEYS.MUSCLES);
    if (cached) {
      return JSON.parse(cached);
    }
    throw error;
  }
};
