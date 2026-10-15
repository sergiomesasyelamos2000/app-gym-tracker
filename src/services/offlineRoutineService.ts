import type { RoutineSessionEntity } from "@sergiomesasyelamos2000/shared";
import {
  RoutineFolderResponseDto,
  RoutineLayoutRequestDto,
  RoutineRequestDto,
  RoutineResponseDto,
} from "@sergiomesasyelamos2000/shared";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createRoutineFolder as apiCreateFolder,
  deleteRoutine as apiDeleteRoutine,
  deleteRoutineFolder as apiDeleteFolder,
  renameRoutineFolder as apiRenameFolder,
  saveRoutine as apiSaveRoutine,
  saveRoutineLayout as apiSaveLayout,
  saveRoutineSession as apiSaveSession,
  updateRoutineById as apiUpdateRoutine,
} from "../features/routine/services/routineService";
import {
  addToSyncQueue,
  filterSyncQueue,
  isOnline,
} from "./syncQueue";

const ROUTINES_CACHE_KEY = "@routines_cache";
const FOLDERS_CACHE_KEY = "@routine_folders_cache";

function kickSync(): void {
  // Lazy require avoids circular dependency with autoSyncService at module load time.
  // Prefer require over dynamic import() so Jest (CJS) does not need --experimental-vm-modules.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const autoSync = require("./autoSyncService") as {
      processSyncQueue?: () => Promise<unknown>;
    };
    if (typeof autoSync.processSyncQueue === "function") {
      void autoSync.processSyncQueue();
    }
  } catch (error) {
    console.warn("[OfflineRoutine] kickSync failed:", error);
  }
}

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

      return result;
    } catch (error) {
      // Fall through to offline save
    }
  }

  // Save locally - preserve complete structure
  const localRoutine: RoutineResponseDto = {
    ...routine,
    id:
      "id" in routine && typeof routine.id === "string"
        ? routine.id
        : `local_${Date.now()}`,
    createdAt:
      "createdAt" in routine && routine.createdAt instanceof Date
        ? routine.createdAt
        : new Date(),
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
        exercise: exercise as any, // Type assertion - el ejercicio ya tiene los datos necesarios
        sets: exercise.sets || [],
        notes: exercise.notes
          ? Array.isArray(exercise.notes)
            ? exercise.notes.map((note, noteIndex) => ({
                id: `note_${index}_${noteIndex}`,
                text: typeof note === "string" ? note : note.text,
                createdAt: new Date().toISOString(),
              }))
            : [
                {
                  id: `note_${index}`,
                  text: exercise.notes as any,
                  createdAt: new Date().toISOString(),
                },
              ]
          : [],
        restSeconds: exercise.restSeconds?.toString() || "60",
        weightUnit: exercise.weightUnit || "kg",
        repsType: exercise.repsType || "reps",
        order: exercise.order || index + 1,
        supersetWith: exercise.supersetWith ?? null, // Cambio aquí: || a ??
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
      return result;
    } catch (error) {}
  }

  // Update locally - preserve complete structure
  const localRoutine: RoutineResponseDto = {
    ...routine,
    id,
    createdAt:
      "createdAt" in routine && routine.createdAt
        ? routine.createdAt
        : new Date(),
    updatedAt: new Date(),
    totalSets:
      routine.exercises?.reduce((sum, ex) => sum + (ex.sets?.length || 0), 0) ||
      0,
    totalExercises: routine.exercises?.length || 0,
    // Convert exercises to routineExercises structure
    routineExercises:
      routine.exercises?.map((exercise, index) => ({
        id: `local_re_${Date.now()}_${index}`,
        exercise: exercise as any,
        sets: exercise.sets || [],
        notes: exercise.notes
          ? Array.isArray(exercise.notes)
            ? exercise.notes.map((note, noteIndex) => ({
                id: `note_${index}_${noteIndex}`,
                text: typeof note === "string" ? note : note.text,
                createdAt: new Date().toISOString(),
              }))
            : [
                {
                  id: `note_${index}`,
                  text: exercise.notes as any,
                  createdAt: new Date().toISOString(),
                },
              ]
          : [],
        restSeconds: exercise.restSeconds?.toString() || "60",
        weightUnit: exercise.weightUnit || "kg",
        repsType: exercise.repsType || "reps",
        order: exercise.order || index + 1,
        supersetWith: exercise.supersetWith ?? null, // Cambio aquí: || a ??
      })) || [],
    isPublic: false,
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
      return result;
    } catch (error) {
      console.error("[OfflineRoutine] API failed with error:", error);
      if (error instanceof Error) {
        console.error("[OfflineRoutine] Error message:", error.message);
        console.error("[OfflineRoutine] Error stack:", error.stack);
      }
      // Check if it's an HTTP error
      if (error && typeof error === "object" && "status" in error) {
        console.error("[OfflineRoutine] HTTP status:", (error as any).status);
        console.error("[OfflineRoutine] Response:", (error as any).response);
      }
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
  await saveLocalRoutine({
    ...routine,
    _isPending: false,
  } as RoutineResponseDto & { _isPending: boolean });

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

async function removeRoutineFromCaches(id: string): Promise<void> {
  try {
    const cached = await AsyncStorage.getItem(ROUTINES_CACHE_KEY);
    if (cached) {
      const routines = JSON.parse(cached) as RoutineResponseDto[];
      await AsyncStorage.setItem(
        ROUTINES_CACHE_KEY,
        JSON.stringify(routines.filter((r) => r.id !== id))
      );
    }
  } catch (error) {
    console.error("[OfflineRoutine] Failed to prune routines cache:", error);
  }

  try {
    const localStr = await AsyncStorage.getItem(LOCAL_ROUTINES_KEY);
    if (localStr) {
      const locals = JSON.parse(localStr) as RoutineResponseDto[];
      await AsyncStorage.setItem(
        LOCAL_ROUTINES_KEY,
        JSON.stringify(locals.filter((r) => r.id !== id))
      );
    }
  } catch (error) {
    console.error("[OfflineRoutine] Failed to prune local routines:", error);
  }

  try {
    await AsyncStorage.removeItem(`@routine_${id}`);
  } catch {
    // ignore
  }
}

/**
 * Delete routine offline-first (local SoT + sync queue).
 */
export async function deleteRoutineOffline(id: string): Promise<void> {
  await removeRoutineFromCaches(id);

  if (id.startsWith("local_")) {
    await filterSyncQueue((op) => {
      if (op.type === "CREATE_ROUTINE") {
        const payload = op.payload as RoutineRequestDto & { id?: string };
        return payload.id !== id;
      }
      if (op.type === "UPDATE_ROUTINE") {
        return (op.payload as { id: string }).id !== id;
      }
      if (op.type === "CREATE_SESSION") {
        return (op.payload as { routineId: string }).routineId !== id;
      }
      if (op.type === "DELETE_ROUTINE") {
        return (op.payload as { id: string }).id !== id;
      }
      return true;
    });
    return;
  }

  const online = await isOnline();
  if (online) {
    try {
      await apiDeleteRoutine(id);
      return;
    } catch {
      // fall through to queue
    }
  }

  await addToSyncQueue("DELETE_ROUTINE", { id });
  kickSync();
}

async function upsertFoldersCache(
  folder: RoutineFolderResponseDto
): Promise<void> {
  try {
    const cached = await AsyncStorage.getItem(FOLDERS_CACHE_KEY);
    const list = cached
      ? (JSON.parse(cached) as RoutineFolderResponseDto[])
      : [];
    await AsyncStorage.setItem(
      FOLDERS_CACHE_KEY,
      JSON.stringify([folder, ...list.filter((f) => f.id !== folder.id)])
    );
  } catch (error) {
    console.error("[OfflineRoutine] Failed to upsert folders cache:", error);
  }
}

async function removeFolderFromCache(id: string): Promise<void> {
  try {
    const cached = await AsyncStorage.getItem(FOLDERS_CACHE_KEY);
    if (!cached) return;
    const list = JSON.parse(cached) as RoutineFolderResponseDto[];
    await AsyncStorage.setItem(
      FOLDERS_CACHE_KEY,
      JSON.stringify(list.filter((f) => f.id !== id))
    );
  } catch (error) {
    console.error("[OfflineRoutine] Failed to prune folders cache:", error);
  }
}

/**
 * Create folder offline-first.
 */
export async function createRoutineFolderOffline(
  title: string,
  localId?: string
): Promise<RoutineFolderResponseDto> {
  const online = await isOnline();
  if (online) {
    try {
      return await apiCreateFolder(title);
    } catch {
      // fall through
    }
  }

  const id =
    localId ??
    `folder_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const folder: RoutineFolderResponseDto = {
    id,
    title: title.trim() || "Grupo",
    sortOrder: 0,
    routineIds: [],
    createdAt: now,
    updatedAt: now,
  };

  await upsertFoldersCache(folder);
  await addToSyncQueue("CREATE_FOLDER", { localId: id, title: folder.title });
  kickSync();
  return folder;
}

/**
 * Rename folder offline-first.
 */
export async function renameRoutineFolderOffline(
  id: string,
  title: string
): Promise<RoutineFolderResponseDto> {
  const nextTitle = title.trim() || "Grupo";
  const now = new Date().toISOString();

  try {
    const cached = await AsyncStorage.getItem(FOLDERS_CACHE_KEY);
    const list = cached
      ? (JSON.parse(cached) as RoutineFolderResponseDto[])
      : [];
    const existing = list.find((f) => f.id === id);
    const folder: RoutineFolderResponseDto = {
      id,
      title: nextTitle,
      sortOrder: existing?.sortOrder ?? 0,
      routineIds: existing?.routineIds ?? [],
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await upsertFoldersCache(folder);

    const online = await isOnline();
    if (online && !id.startsWith("folder_")) {
      try {
        return await apiRenameFolder(id, nextTitle);
      } catch {
        // queue below
      }
    }

    // Local-only folders that were never synced: update pending CREATE title.
    if (id.startsWith("folder_")) {
      await filterSyncQueue((op) => {
        if (op.type !== "CREATE_FOLDER") return true;
        return (op.payload as { localId: string }).localId !== id;
      });
      await addToSyncQueue("CREATE_FOLDER", { localId: id, title: nextTitle });
    } else {
      await addToSyncQueue("RENAME_FOLDER", { id, title: nextTitle });
    }
    kickSync();
    return folder;
  } catch (error) {
    console.error("[OfflineRoutine] rename folder failed:", error);
    throw error;
  }
}

/**
 * Delete folder offline-first (API delete; local layout dissolve is caller's job).
 */
export async function deleteRoutineFolderOffline(id: string): Promise<void> {
  await removeFolderFromCache(id);

  if (id.startsWith("folder_")) {
    await filterSyncQueue((op) => {
      if (op.type === "CREATE_FOLDER") {
        return (op.payload as { localId: string }).localId !== id;
      }
      if (op.type === "RENAME_FOLDER" || op.type === "DELETE_FOLDER") {
        return (op.payload as { id: string }).id !== id;
      }
      return true;
    });
    return;
  }

  const online = await isOnline();
  if (online) {
    try {
      await apiDeleteFolder(id);
      return;
    } catch {
      // queue
    }
  }

  await addToSyncQueue("DELETE_FOLDER", { id });
  kickSync();
}

/**
 * Persist layout offline-first (cache + coalesced UPSERT_LAYOUT queue).
 */
export async function saveRoutineLayoutOffline(
  layout: RoutineLayoutRequestDto
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      FOLDERS_CACHE_KEY,
      JSON.stringify(
        layout.folders.map((folder) => {
          const sortIndex = layout.rootOrder.findIndex(
            (item) => item.type === "folder" && item.id === folder.id
          );
          return {
            id: folder.id,
            title: folder.title,
            sortOrder: sortIndex >= 0 ? sortIndex : 0,
            routineIds: folder.routineIds,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        })
      )
    );
  } catch (cacheError) {
    console.error("[OfflineRoutine] Failed to cache layout:", cacheError);
  }

  const online = await isOnline();
  if (online) {
    try {
      await apiSaveLayout(layout);
      return;
    } catch {
      // queue
    }
  }

  await addToSyncQueue("UPSERT_LAYOUT", layout);
  kickSync();
}
