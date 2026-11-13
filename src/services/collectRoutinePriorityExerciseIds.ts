import AsyncStorage from "@react-native-async-storage/async-storage";

const ROUTINES_CACHE_KEY = "@routines_cache";
const LOCAL_ROUTINES_KEY = "@local_routines";

/** Detail keys we must not treat as routine payloads. */
const ROUTINE_PREFIX_EXCLUSIONS = new Set([
  "@routine_folders_cache",
  "@routine_id_mapping",
]);

function isRoutineDetailCacheKey(key: string): boolean {
  return (
    key.startsWith("@routine_") && !ROUTINE_PREFIX_EXCLUSIONS.has(key)
  );
}

function pushId(ids: string[], seen: Set<string>, value: unknown): void {
  if (typeof value !== "string") return;
  const id = value.trim();
  if (!id || seen.has(id)) return;
  seen.add(id);
  ids.push(id);
}

/**
 * Extract exercise IDs from a routine-shaped object (list or detail cache).
 * Prefer nested `routineExercises[].exercise.id`; accept common aliases.
 */
export function extractExerciseIdsFromRoutine(routine: unknown): string[] {
  if (!routine || typeof routine !== "object") return [];
  const record = routine as Record<string, unknown>;
  const ids: string[] = [];
  const seen = new Set<string>();

  const routineExercises = record.routineExercises;
  if (Array.isArray(routineExercises)) {
    for (const entry of routineExercises) {
      if (!entry || typeof entry !== "object") continue;
      const re = entry as Record<string, unknown>;
      const exercise = re.exercise;
      if (exercise && typeof exercise === "object") {
        pushId(ids, seen, (exercise as { id?: unknown }).id);
      }
      pushId(ids, seen, re.exerciseId);
    }
  }

  const exercises = record.exercises;
  if (Array.isArray(exercises)) {
    for (const entry of exercises) {
      if (!entry || typeof entry !== "object") continue;
      pushId(ids, seen, (entry as { id?: unknown }).id);
      pushId(ids, seen, (entry as { exerciseId?: unknown }).exerciseId);
    }
  }

  return ids;
}

function collectFromJsonBlob(raw: string | null, ids: string[], seen: Set<string>): void {
  if (!raw) return;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return;
  }

  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      for (const id of extractExerciseIdsFromRoutine(item)) {
        pushId(ids, seen, id);
      }
    }
    return;
  }

  for (const id of extractExerciseIdsFromRoutine(parsed)) {
    pushId(ids, seen, id);
  }
}

/**
 * AsyncStorage-only: exercise IDs that appear in saved routines, for media warm priority.
 * No network. Order is first-seen across list cache → local routines → detail keys.
 */
export async function collectRoutinePriorityExerciseIds(): Promise<string[]> {
  const ids: string[] = [];
  const seen = new Set<string>();

  try {
    const [listRaw, localRaw] = await Promise.all([
      AsyncStorage.getItem(ROUTINES_CACHE_KEY),
      AsyncStorage.getItem(LOCAL_ROUTINES_KEY),
    ]);
    collectFromJsonBlob(listRaw, ids, seen);
    collectFromJsonBlob(localRaw, ids, seen);
  } catch {
    // best-effort
  }

  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const detailKeys = allKeys.filter(isRoutineDetailCacheKey);
    if (detailKeys.length === 0) return ids;

    const pairs = await AsyncStorage.multiGet(detailKeys);
    for (const [, value] of pairs) {
      collectFromJsonBlob(value, ids, seen);
    }
  } catch {
    // best-effort
  }

  return ids;
}
