import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch } from "../../../api/client";
import {
  RoutineRequestDto,
  RoutineResponseDto,
} from "@entity-data-models/index";
import type { RoutineSessionEntity } from "@entity-data-models/frontend-types";
import type { CaughtError } from "../../../types";

const ROUTINES_CACHE_KEY = "@routines_cache";

export async function saveRoutine(
  routineRequestDto: RoutineRequestDto,
): Promise<RoutineResponseDto> {
  return await apiFetch<RoutineResponseDto>("routines", {
    method: "POST",
    body: JSON.stringify(routineRequestDto),
  });
}

export async function findAllRoutines(): Promise<RoutineResponseDto[]> {
  try {
    // Try to fetch from API
    const routines = await apiFetch<RoutineResponseDto[]>("routines", {
      method: "GET",
    });

    // Cache for offline use
    await AsyncStorage.setItem(ROUTINES_CACHE_KEY, JSON.stringify(routines));
    console.log(`[RoutineService] Cached ${routines.length} routines`);

    return routines;
  } catch (error: CaughtError) {
    // If network fails, load from cache
    console.log("[RoutineService] API failed, loading routines from cache");

    try {
      const cached = await AsyncStorage.getItem(ROUTINES_CACHE_KEY);
      if (cached) {
        const routines = JSON.parse(cached);
        console.log(`[RoutineService] Loaded ${routines.length} routines from cache`);
        return routines;
      }
    } catch (cacheError) {
      console.error("[RoutineService] Cache read failed:", cacheError);
    }

    // If both fail, return empty array instead of throwing
    console.warn("[RoutineService] No cached routines available");
    return [];
  }
}

export async function getRoutineById(id: string): Promise<RoutineResponseDto> {
  try {
    // Try to fetch from API
    const routine = await apiFetch<RoutineResponseDto>(`routines/${id}`, {
      method: "GET",
    });

    // Cache individual routine (includes full exercises)
    await cacheIndividualRoutine(routine);
    console.log(`[RoutineService] Cached routine ${id} with ${routine.routineExercises?.length || 0} exercises`);

    return routine;
  } catch (error: CaughtError) {
    // If network fails, try to get from cache
    console.log(`[RoutineService] API failed for routine ${id}, loading from cache`);

    // Try individual cache first (has full details including exercises)
    const routineFromIndividualCache = await getRoutineFromIndividualCache(id);
    if (routineFromIndividualCache) {
      console.log(`[RoutineService] Found routine ${id} in individual cache with ${routineFromIndividualCache.routineExercises?.length || 0} exercises`);
      return routineFromIndividualCache;
    }

    // Try local cache for offline routines
    const routineFromLocalCache = await getRoutineFromLocalCache(id);
    if (routineFromLocalCache) {
      console.log(`[RoutineService] Found routine ${id} in local cache with ${routineFromLocalCache.routineExercises?.length || 0} exercises`);
      return routineFromLocalCache;
    }

    // Try main cache as last resort (might not have full details)
    const routineFromMainCache = await getRoutineFromMainCache(id);
    if (routineFromMainCache) {
      console.log(`[RoutineService] Found routine ${id} in main cache (may not have exercises)`);
      return routineFromMainCache;
    }

    console.error(`[RoutineService] Routine ${id} not found in any cache`);
    throw new Error("No se pudo cargar la rutina. Verifica tu conexión.");
  }
}

/**
 * Cache individual routine for offline access
 */
async function cacheIndividualRoutine(routine: RoutineResponseDto): Promise<void> {
  try {
    const INDIVIDUAL_CACHE_KEY = `@routine_${routine.id}`;
    await AsyncStorage.setItem(INDIVIDUAL_CACHE_KEY, JSON.stringify(routine));
    console.log(`[RoutineService] Individual cache saved for ${routine.id}`);
  } catch (error) {
    console.error("[RoutineService] Failed to cache individual routine:", error);
  }
}

/**
 * Get routine from individual cache (@routine_{id})
 */
async function getRoutineFromIndividualCache(id: string): Promise<RoutineResponseDto | null> {
  try {
    const INDIVIDUAL_CACHE_KEY = `@routine_${id}`;
    const cached = await AsyncStorage.getItem(INDIVIDUAL_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      console.log(`[RoutineService] Individual cache data for ${id}:`, {
        hasData: !!parsed,
        hasRoutineExercises: !!parsed.routineExercises,
        count: parsed.routineExercises?.length || 0
      });
      return parsed;
    }
    console.log(`[RoutineService] No individual cache for ${id}`);
  } catch (error) {
    console.error("[RoutineService] Failed to read from individual cache:", error);
  }
  return null;
}

/**
 * Get routine from main cache (@routines_cache)
 */
async function getRoutineFromMainCache(id: string): Promise<RoutineResponseDto | null> {
  try {
    const cached = await AsyncStorage.getItem(ROUTINES_CACHE_KEY);
    if (cached) {
      const routines: RoutineResponseDto[] = JSON.parse(cached);
      const routine = routines.find((r) => r.id === id);
      if (routine) {
        console.log(`[RoutineService] Main cache data for ${id}:`, {
          hasData: !!routine,
          hasRoutineExercises: !!routine.routineExercises,
          count: routine.routineExercises?.length || 0
        });
      } else {
        console.log(`[RoutineService] Routine ${id} not found in main cache`);
      }
      return routine || null;
    }
    console.log(`[RoutineService] Main cache is empty`);
  } catch (error) {
    console.error("[RoutineService] Failed to read from main cache:", error);
  }
  return null;
}

/**
 * Get routine from local cache (@local_routines)
 */
async function getRoutineFromLocalCache(id: string): Promise<RoutineResponseDto | null> {
  try {
    const LOCAL_ROUTINES_KEY = "@local_routines";
    const cached = await AsyncStorage.getItem(LOCAL_ROUTINES_KEY);
    if (cached) {
      const routines: RoutineResponseDto[] = JSON.parse(cached);
      const routine = routines.find((r) => r.id === id);
      if (routine) {
        console.log(`[RoutineService] Local cache data for ${id}:`, {
          hasData: !!routine,
          hasRoutineExercises: !!routine.routineExercises,
          count: routine.routineExercises?.length || 0
        });
      } else {
        console.log(`[RoutineService] Routine ${id} not found in local cache`);
      }
      return routine || null;
    }
    console.log(`[RoutineService] Local cache is empty`);
  } catch (error) {
    console.error("[RoutineService] Failed to read from local cache:", error);
  }
  return null;
}

export async function updateRoutineById(
  id: string,
  routineRequestDto: RoutineRequestDto,
): Promise<RoutineResponseDto> {
  return await apiFetch<RoutineResponseDto>(`routines/${id}`, {
    method: "PUT",
    body: JSON.stringify(routineRequestDto),
  });
}

export async function duplicateRoutine(id: string): Promise<void> {
  await apiFetch<void>(`routines/${id}/duplicate`, {
    method: "POST",
  });
}

export async function deleteRoutine(id: string): Promise<void> {
  await apiFetch<void>(`routines/${id}`, {
    method: "DELETE",
  });
}

export async function saveRoutineSession(
  id: string,
  session: Partial<RoutineSessionEntity>,
): Promise<RoutineSessionEntity> {
  return await apiFetch<RoutineSessionEntity>(`routines/${id}/sessions`, {
    method: "POST",
    body: JSON.stringify(session),
  });
}

const SESSIONS_CACHE_KEY = "@sessions_cache";

export async function findAllRoutineSessions(): Promise<
  RoutineSessionEntity[]
> {
  try {
    // Try to fetch from API
    const sessions = await apiFetch<RoutineSessionEntity[]>("routines/sessions", {
      method: "GET",
    });

    // Cache for offline use
    await AsyncStorage.setItem(SESSIONS_CACHE_KEY, JSON.stringify(sessions));
    console.log(`[RoutineService] Cached ${sessions.length} sessions`);

    return sessions;
  } catch (error: CaughtError) {
    // If network fails, load from cache
    console.log("[RoutineService] API failed, loading sessions from cache");

    try {
      const cached = await AsyncStorage.getItem(SESSIONS_CACHE_KEY);
      if (cached) {
        const sessions = JSON.parse(cached);
        console.log(`[RoutineService] Loaded ${sessions.length} sessions from cache`);
        return sessions;
      }
    } catch (cacheError) {
      console.error("[RoutineService] Sessions cache read failed:", cacheError);
    }

    // If both fail, return empty array
    console.warn("[RoutineService] No cached sessions available");
    return [];
  }
}

export async function findRoutineSessions(
  id: string,
): Promise<RoutineSessionEntity[]> {
  try {
    // Try to fetch from API
    const sessions = await apiFetch<RoutineSessionEntity[]>(`routines/${id}/sessions`, {
      method: "GET",
    });

    // Cache individual routine sessions
    const cacheKey = `@sessions_routine_${id}`;
    await AsyncStorage.setItem(cacheKey, JSON.stringify(sessions));
    console.log(`[RoutineService] Cached ${sessions.length} sessions for routine ${id}`);

    return sessions;
  } catch (error: CaughtError) {
    // If network fails, try cache
    console.log(`[RoutineService] API failed, loading sessions for routine ${id} from cache`);

    try {
      const cacheKey = `@sessions_routine_${id}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const sessions = JSON.parse(cached);
        console.log(`[RoutineService] Loaded ${sessions.length} sessions from cache`);
        return sessions;
      }
    } catch (cacheError) {
      console.error("[RoutineService] Sessions cache read failed:", cacheError);
    }

    // If both fail, return empty array
    console.warn(`[RoutineService] No cached sessions for routine ${id}`);
    return [];
  }
}

export interface GlobalStats {
  totalRoutines: number;
  totalSessions: number;
  totalVolume: number;
  totalDuration: number;
  averageSessionDuration?: number;
  mostUsedExercises?: Array<{
    exerciseId: string;
    exerciseName: string;
    count: number;
  }>;
  weeklyProgress?: Array<{
    week: string;
    sessions: number;
    volume: number;
  }>;
}

export async function getGlobalStats(): Promise<GlobalStats> {
  return await apiFetch<GlobalStats>("routines/stats/global", {
    method: "GET",
  });
}

export const reorderRoutineExercises = async (
  routineId: string,
  exerciseIds: string[],
): Promise<void> => {
  await apiFetch<void>(`routines/${routineId}/reorder`, {
    method: "PUT",
    body: JSON.stringify({ exerciseIds }),
  });
};
