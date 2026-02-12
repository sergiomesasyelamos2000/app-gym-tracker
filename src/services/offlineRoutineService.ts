import {
  RoutineRequestDto,
  RoutineResponseDto,
} from "@entity-data-models/index";
import type { RoutineSessionEntity } from "@entity-data-models/frontend-types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  saveRoutine as apiSaveRoutine,
  saveRoutineSession as apiSaveSession,
  updateRoutineById as apiUpdateRoutine,
} from "../features/routine/services/routineService";
import { addToSyncQueue, isOnline } from "./syncQueue";

const LOCAL_ROUTINES_KEY = "@local_routines";
const LOCAL_SESSIONS_KEY = "@local_sessions";

/**
 * Save routine with offline support
 */
export async function saveRoutineOffline(
  routine: RoutineRequestDto
): Promise<RoutineResponseDto> {
  const online = await isOnline();

  if (online) {
    try {
      // Try to save to API
      const result = await apiSaveRoutine(routine);

      // Update local cache
      await updateLocalRoutineCache(result);

      console.log(
        `[OfflineRoutine] Routine saved to API: ${result.id} with ${
          result.routineExercises?.length || 0
        } exercises`
      );
      return result;
    } catch (error) {
      console.log("[OfflineRoutine] API failed, saving locally", error);
      // Fall through to offline save
    }
  }

  // Save locally - preserve complete structure
  const localRoutine: RoutineResponseDto = {
    ...routine,
    id: 'id' in routine && typeof routine.id === 'string' ? routine.id : `local_${Date.now()}`,
    createdAt: 'createdAt' in routine && routine.createdAt instanceof Date ? routine.createdAt : new Date(),
    updatedAt: new Date(),
    userId: "", // Will be filled on sync
    totalSets:
      routine.exercises?.reduce((sum, ex) => sum + (ex.sets?.length || 0), 0) ||
      0,
    totalExercises: routine.exercises?.length || 0,
    isPublic: false,
    // Convert exercises to routineExercises structure
    routineExercises:
      routine.exercises?.map((exercise, index) => ({
        id: `local_re_${Date.now()}_${index}`,
        exercise: exercise,
        sets: exercise.sets || [],
        notes: exercise.notes
          ? [
              {
                id: `note_${index}`,
                text: exercise.notes,
                createdAt: new Date().toISOString(),
              },
            ]
          : [],
        restSeconds: exercise.restSeconds?.toString() || "60",
        weightUnit: exercise.weightUnit || "kg",
        repsType: exercise.repsType || "reps",
        order: exercise.order || index + 1,
        supersetWith: exercise.supersetWith || null,
      })) || [],
  };

  // Add _isPending metadata flag
  const localRoutineWithMetadata = {
    ...localRoutine,
    _isPending: true, // Flag for pending sync
  } as RoutineResponseDto & { _isPending: boolean };

  await saveLocalRoutine(localRoutineWithMetadata);
  await updateRoutinesCache(localRoutineWithMetadata); // Add to main cache so it shows in list
  await cacheIndividualRoutineLocally(localRoutineWithMetadata); // Cache individually too
  await addToSyncQueue("CREATE_ROUTINE", routine);

  console.log(
    `[OfflineRoutine] Routine saved locally: ${localRoutineWithMetadata.id} with ${
      localRoutineWithMetadata.routineExercises?.length || 0
    } exercises`
  );
  return localRoutineWithMetadata;
}

/**
 * Update routine with offline support
 */
export async function updateRoutineOffline(
  id: string,
  routine: RoutineRequestDto
): Promise<RoutineResponseDto> {
  const online = await isOnline();

  if (online && !id.startsWith("local_")) {
    try {
      const result = await apiUpdateRoutine(id, routine);
      await updateLocalRoutineCache(result);
      console.log("[OfflineRoutine] Routine updated on API:", result.id);
      return result;
    } catch (error) {
      console.log("[OfflineRoutine] API failed, updating locally");
    }
  }

  // Update locally - preserve complete structure
  const localRoutine: RoutineResponseDto = {
    ...routine,
    id,
    updatedAt: new Date(),
    totalSets:
      routine.exercises?.reduce((sum, ex) => sum + (ex.sets?.length || 0), 0) ||
      0,
    totalExercises: routine.exercises?.length || 0,
    // Convert exercises to routineExercises structure
    routineExercises:
      routine.exercises?.map((exercise, index) => ({
        id: `local_re_${Date.now()}_${index}`,
        exercise: exercise,
        sets: exercise.sets || [],
        notes: exercise.notes
          ? [
              {
                id: `note_${index}`,
                text: exercise.notes,
                createdAt: new Date().toISOString(),
              },
            ]
          : [],
        restSeconds: exercise.restSeconds?.toString() || "60",
        weightUnit: exercise.weightUnit || "kg",
        repsType: exercise.repsType || "reps",
        order: exercise.order || index + 1,
        supersetWith: exercise.supersetWith || null,
      })) || [],
  };

  // Add _isPending metadata flag
  const localRoutineWithMetadata = {
    ...localRoutine,
    _isPending: true,
  } as RoutineResponseDto & { _isPending: boolean };

  await saveLocalRoutine(localRoutineWithMetadata);
  await updateRoutinesCache(localRoutineWithMetadata); // Update in main cache
  await cacheIndividualRoutineLocally(localRoutineWithMetadata); // Update individual cache
  await addToSyncQueue("UPDATE_ROUTINE", { id, routine });

  console.log(
    `[OfflineRoutine] Routine updated locally: ${id} with ${
      localRoutineWithMetadata.routineExercises?.length || 0
    } exercises`
  );
  return localRoutineWithMetadata;
}

/**
 * Save routine session with offline support
 */
export async function saveSessionOffline(
  routineId: string,
  session: Partial<RoutineSessionEntity>
): Promise<RoutineSessionEntity> {
  const online = await isOnline();

  if (online && !routineId.startsWith("local_")) {
    try {
      const result = await apiSaveSession(routineId, session);
      await saveLocalSession(result);
      console.log("[OfflineRoutine] Session saved to API:", result.id);
      return result;
    } catch (error) {
      console.log("[OfflineRoutine] API failed, saving session locally");
    }
  }

  // Save locally
  const localSession: RoutineSessionEntity & { _isPending: boolean } = {
    ...session,
    id: `local_session_${Date.now()}`,
    routineId,
    createdAt: new Date(),
    _isPending: true,
  } as RoutineSessionEntity & { _isPending: boolean };

  await saveLocalSession(localSession);
  await addToSyncQueue("CREATE_SESSION", { routineId, session });

  console.log("[OfflineRoutine] Session saved locally:", localSession.id);
  return localSession;
}

/**
 * Save routine to local storage
 */
async function saveLocalRoutine(routine: RoutineResponseDto): Promise<void> {
  try {
    const routinesStr = await AsyncStorage.getItem(LOCAL_ROUTINES_KEY);
    const routines: RoutineResponseDto[] = routinesStr
      ? JSON.parse(routinesStr)
      : [];

    const index = routines.findIndex((r) => r.id === routine.id);
    if (index >= 0) {
      routines[index] = routine;
    } else {
      routines.push(routine);
    }

    await AsyncStorage.setItem(LOCAL_ROUTINES_KEY, JSON.stringify(routines));
  } catch (error) {
    console.error("[OfflineRoutine] Failed to save local routine:", error);
  }
}

/**
 * Save session to local storage
 */
async function saveLocalSession(session: RoutineSessionEntity): Promise<void> {
  try {
    const sessionsStr = await AsyncStorage.getItem(LOCAL_SESSIONS_KEY);
    const sessions: RoutineSessionEntity[] = sessionsStr
      ? JSON.parse(sessionsStr)
      : [];
    sessions.push(session);
    await AsyncStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error("[OfflineRoutine] Failed to save local session:", error);
  }
}

/**
 * Update local routine cache
 */
async function updateLocalRoutineCache(
  routine: RoutineResponseDto
): Promise<void> {
  await saveLocalRoutine({ ...routine, _isPending: false } as RoutineResponseDto & { _isPending: boolean });

  // Also update the main routines cache so it shows in the list
  await updateRoutinesCache(routine);

  // Cache individually with full details
  await cacheIndividualRoutineLocally(routine);
}

/**
 * Update the main routines cache (for WorkoutScreen list)
 */
async function updateRoutinesCache(routine: RoutineResponseDto): Promise<void> {
  try {
    const ROUTINES_CACHE_KEY = "@routines_cache";
    const cached = await AsyncStorage.getItem(ROUTINES_CACHE_KEY);
    const routines: RoutineResponseDto[] = cached ? JSON.parse(cached) : [];

    // Add or update routine in cache
    const index = routines.findIndex((r) => r.id === routine.id);
    if (index >= 0) {
      routines[index] = routine;
    } else {
      routines.unshift(routine); // Add to beginning
    }

    await AsyncStorage.setItem(ROUTINES_CACHE_KEY, JSON.stringify(routines));
    console.log(`[OfflineRoutine] Updated routines cache with: ${routine.id}`);
  } catch (error) {
    console.error("[OfflineRoutine] Failed to update routines cache:", error);
  }
}

/**
 * Cache individual routine (includes full exercises)
 */
async function cacheIndividualRoutineLocally(
  routine: RoutineResponseDto
): Promise<void> {
  try {
    const INDIVIDUAL_CACHE_KEY = `@routine_${routine.id}`;
    await AsyncStorage.setItem(INDIVIDUAL_CACHE_KEY, JSON.stringify(routine));
    console.log(
      `[OfflineRoutine] Cached individual routine ${routine.id} with ${
        routine.routineExercises?.length || 0
      } exercises`
    );
  } catch (error) {
    console.error(
      "[OfflineRoutine] Failed to cache individual routine:",
      error
    );
  }
}

/**
 * Get all local routines
 */
export async function getLocalRoutines(): Promise<RoutineResponseDto[]> {
  try {
    const routinesStr = await AsyncStorage.getItem(LOCAL_ROUTINES_KEY);
    return routinesStr ? JSON.parse(routinesStr) : [];
  } catch (error) {
    console.error("[OfflineRoutine] Failed to get local routines:", error);
    return [];
  }
}
