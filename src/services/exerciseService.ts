import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch } from "../api/client";
import {
  CreateExerciseDto,
  EquipmentDto,
  ExerciseRequestDto,
  ExerciseTypeDto,
  MuscleDto,
} from "../models/index.js";

const CACHE_KEYS = {
  EXERCISES: "@exercises_cache",
  EQUIPMENT: "@equipment_cache",
  EXERCISE_TYPES: "@exercise_types_cache",
  MUSCLES: "@muscles_cache",
  LAST_SYNC: "@exercises_last_sync",
};

const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

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
  try {
    // Try to fetch from backend first
    const data = await apiFetch<ExerciseRequestDto[]>("exercises");

    // Save to cache for offline use
    await AsyncStorage.setItem(CACHE_KEYS.EXERCISES, JSON.stringify(data));
    await AsyncStorage.setItem(CACHE_KEYS.LAST_SYNC, Date.now().toString());
    await AsyncStorage.setItem(`${CACHE_KEYS.EXERCISES}_from_cache`, "false");

    console.log("[ExerciseService] Exercises fetched from API and cached");
    return data;
  } catch (error: any) {
    // If network fails, try to load from cache
    const isNetworkError =
      error?.message?.includes("Network") ||
      error?.message?.includes("network") ||
      error?.message?.includes("fetch");

    console.log("[ExerciseService] API failed (network:", isNetworkError, "), attempting to load from cache");

    try {
      const cached = await AsyncStorage.getItem(CACHE_KEYS.EXERCISES);
      if (cached) {
        const exercises = JSON.parse(cached);
        await AsyncStorage.setItem(`${CACHE_KEYS.EXERCISES}_from_cache`, "true");
        console.log("[ExerciseService] Loaded", exercises.length, "exercises from cache");
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
 * Check if last fetch was from cache (offline mode)
 */
export const isUsingCache = async (): Promise<boolean> => {
  try {
    const fromCache = await AsyncStorage.getItem(`${CACHE_KEYS.EXERCISES}_from_cache`);
    return fromCache === "true";
  } catch {
    return false;
  }
};

export const searchExercises = async (
  query: string,
): Promise<ExerciseRequestDto[]> => {
  try {
    return await apiFetch<ExerciseRequestDto[]>(
      `exercises/search?name=${encodeURIComponent(query)}`,
    );
  } catch (error) {
    // Fallback to local filtering if offline
    console.log("[ExerciseService] Search API failed, using local cache");
    const cached = await AsyncStorage.getItem(CACHE_KEYS.EXERCISES);
    if (cached) {
      const exercises: ExerciseRequestDto[] = JSON.parse(cached);
      return exercises.filter((ex) =>
        ex.name.toLowerCase().includes(query.toLowerCase())
      );
    }
    throw error;
  }
};

export const createExercise = async (
  exercise: CreateExerciseDto,
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
      console.log("[ExerciseService] Loaded equipment from cache");
      return JSON.parse(cached);
    }
    throw error;
  }
};

export const fetchExerciseTypes = async (): Promise<ExerciseTypeDto[]> => {
  try {
    const data = await apiFetch<ExerciseTypeDto[]>("exercises/exercise-types/all");
    await AsyncStorage.setItem(CACHE_KEYS.EXERCISE_TYPES, JSON.stringify(data));
    return data;
  } catch (error) {
    const cached = await AsyncStorage.getItem(CACHE_KEYS.EXERCISE_TYPES);
    if (cached) {
      console.log("[ExerciseService] Loaded exercise types from cache");
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
      console.log("[ExerciseService] Loaded muscles from cache");
      return JSON.parse(cached);
    }
    throw error;
  }
};
