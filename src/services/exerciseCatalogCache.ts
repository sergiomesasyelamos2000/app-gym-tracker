import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ExerciseRequestDto } from "@sergiomesasyelamos2000/shared";
import { ENV } from "../environments/environment";

export const EXERCISE_CATALOG_TTL_MS = 24 * 60 * 60 * 1000;
export const EXERCISE_CACHE_KEY = "@exercises_cache_v4";
export const LEGACY_EXERCISE_CACHE_KEYS = [
  "@exercises_cache_v3",
  "@exercises_cache_v2",
] as const;
/** @deprecated use LEGACY_EXERCISE_CACHE_KEYS */
export const LEGACY_EXERCISE_CACHE_KEY = LEGACY_EXERCISE_CACHE_KEYS[0];
export const EXERCISE_LAST_SYNC_KEY = "@exercises_last_sync";
export const EXERCISE_CACHE_API_URL_KEY = "@exercises_cache_api_url";
export const EXERCISE_FROM_CACHE_FLAG_KEY = `${EXERCISE_CACHE_KEY}_from_cache`;

const AUX_CACHE_KEYS = [
  "@equipment_cache",
  "@muscles_cache",
  "@exercise_types_cache",
];

export type ExerciseCatalogSnapshot = {
  exercises: ExerciseRequestDto[];
  syncedAt: number;
  apiUrl: string;
  fromOfflineCache: boolean;
};

type MemorySlot = ExerciseCatalogSnapshot | null;

let memory: MemorySlot = null;
/** Bumped on local upserts so in-flight network writes can merge instead of clobbering. */
let catalogWriteGeneration = 0;

const normalizeApiUrl = (value: string) =>
  value.trim().replace(/\/+$/, "").toLowerCase();

const currentApiUrl = () => normalizeApiUrl(ENV.API_URL);

const isStorageFullError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error || "");
  const normalized = message.toLowerCase();
  return (
    normalized.includes("sqlite_full") ||
    normalized.includes("database or disk is full") ||
    normalized.includes("code 13")
  );
};

const isHttpImageUrl = (value: unknown): boolean => {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return trimmed.startsWith("http://") || trimmed.startsWith("https://");
};

const looksLikeBase64Image = (value: unknown): boolean => {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("data:")) return true;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return false;
  }
  return trimmed.length > 50;
};

const catalogHasOnlyHttpImages = (exercises: ExerciseRequestDto[]): boolean =>
  exercises.every((exercise) => {
    const imageUrl = exercise.imageUrl;
    if (imageUrl == null || String(imageUrl).trim() === "") return true;
    return isHttpImageUrl(imageUrl) && !looksLikeBase64Image(imageUrl);
  });

const catalogHasBase64Images = (exercises: ExerciseRequestDto[]): boolean =>
  exercises.some((exercise) => looksLikeBase64Image(exercise.imageUrl));

const allCatalogStorageKeys = (): string[] => [
  EXERCISE_CACHE_KEY,
  ...LEGACY_EXERCISE_CACHE_KEYS,
  EXERCISE_LAST_SYNC_KEY,
  EXERCISE_CACHE_API_URL_KEY,
  EXERCISE_FROM_CACHE_FLAG_KEY,
  ...LEGACY_EXERCISE_CACHE_KEYS.map((key) => `${key}_from_cache`),
];

async function safeSetItem(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (error) {
    if (isStorageFullError(error)) {
      try {
        await AsyncStorage.multiRemove(AUX_CACHE_KEYS);
        await AsyncStorage.setItem(key, value);
        return;
      } catch {
        // Fall through to warn.
      }
    }
    console.warn(
      `[ExerciseCatalogCache] No se pudo guardar cache para ${key}:`,
      error
    );
  }
}

function setMemory(
  exercises: ExerciseRequestDto[],
  syncedAt: number,
  fromOfflineCache = false
): void {
  memory = {
    exercises,
    syncedAt,
    apiUrl: currentApiUrl(),
    fromOfflineCache,
  };
}

export function bumpCatalogWriteGeneration(): number {
  catalogWriteGeneration += 1;
  return catalogWriteGeneration;
}

export function getCatalogWriteGeneration(): number {
  return catalogWriteGeneration;
}

/** Synchronous memory peek for instant list paint. */
export function peekExerciseCatalog(): ExerciseRequestDto[] | null {
  if (!memory) return null;
  if (memory.apiUrl !== currentApiUrl()) return null;
  if (!memory.exercises.length) return null;
  return memory.exercises;
}

export function peekExerciseCatalogSnapshot(): ExerciseCatalogSnapshot | null {
  if (!memory) return null;
  if (memory.apiUrl !== currentApiUrl()) return null;
  return memory;
}

export function isExerciseCatalogStale(now: number = Date.now()): boolean {
  const syncedAt = memory?.syncedAt;
  if (!syncedAt) return true;
  if (memory?.apiUrl !== currentApiUrl()) return true;
  return now - syncedAt > EXERCISE_CATALOG_TTL_MS;
}

export function invalidateExerciseCatalogMemory(): void {
  memory = null;
}

function mergeExerciseIntoList(
  exercises: ExerciseRequestDto[],
  exercise: ExerciseRequestDto
): ExerciseRequestDto[] {
  const exists = exercises.some((item) => item.id === exercise.id);
  if (exists) {
    return exercises.map((item) =>
      item.id === exercise.id ? exercise : item
    );
  }
  return [exercise, ...exercises];
}

/**
 * Upsert into memory + disk. Bumps write generation so in-flight network
 * refreshes merge instead of wiping a just-created exercise.
 */
export function upsertExerciseInCatalog(exercise: ExerciseRequestDto): void {
  bumpCatalogWriteGeneration();

  if (memory && memory.apiUrl === currentApiUrl()) {
    const next = mergeExerciseIntoList(memory.exercises, exercise);
    setMemory(next, memory.syncedAt, memory.fromOfflineCache);
    void writeExerciseCatalog(next, memory.syncedAt);
    return;
  }

  // Cold path: optimistic one-item memory, then merge with disk (skip memory peek).
  setMemory([exercise], Date.now(), false);
  void (async () => {
    const fromDisk = await readCatalogFromDiskOnly();
    const base = fromDisk?.exercises ?? [];
    const next = mergeExerciseIntoList(base, exercise);
    await writeExerciseCatalog(next, fromDisk?.syncedAt ?? Date.now());
  })();
}

export async function writeExerciseCatalog(
  exercises: ExerciseRequestDto[],
  syncedAt: number,
  options?: { fromOfflineCache?: boolean }
): Promise<void> {
  const fromOfflineCache = options?.fromOfflineCache === true;
  setMemory(exercises, syncedAt, fromOfflineCache);

  await Promise.all([
    safeSetItem(EXERCISE_CACHE_KEY, JSON.stringify(exercises)),
    safeSetItem(EXERCISE_LAST_SYNC_KEY, String(syncedAt)),
    safeSetItem(EXERCISE_CACHE_API_URL_KEY, currentApiUrl()),
    safeSetItem(
      EXERCISE_FROM_CACHE_FLAG_KEY,
      fromOfflineCache ? "true" : "false"
    ),
  ]);
}

/**
 * Persist a network fetch. If an upsert happened during the fetch,
 * keep local-only exercises missing from the payload.
 */
export async function applyNetworkExerciseCatalog(
  exercises: ExerciseRequestDto[],
  generationAtFetchStart: number
): Promise<void> {
  let merged = exercises;
  if (
    catalogWriteGeneration !== generationAtFetchStart &&
    memory?.exercises.length &&
    memory.apiUrl === currentApiUrl()
  ) {
    const byId = new Map(exercises.map((item) => [item.id, item]));
    for (const local of memory.exercises) {
      if (!byId.has(local.id)) {
        byId.set(local.id, local);
      }
    }
    merged = Array.from(byId.values());
  }
  await writeExerciseCatalog(merged, Date.now(), { fromOfflineCache: false });
}

export async function markExerciseCatalogOffline(
  fromCache: boolean
): Promise<void> {
  if (memory && memory.apiUrl === currentApiUrl()) {
    memory = { ...memory, fromOfflineCache: fromCache };
  }
  await safeSetItem(EXERCISE_FROM_CACHE_FLAG_KEY, fromCache ? "true" : "false");
}

export async function isExerciseCatalogFromOfflineCache(): Promise<boolean> {
  if (memory && memory.apiUrl === currentApiUrl()) {
    return memory.fromOfflineCache;
  }
  try {
    const flag = await AsyncStorage.getItem(EXERCISE_FROM_CACHE_FLAG_KEY);
    return flag === "true";
  } catch {
    return false;
  }
}

async function migrateLegacyCatalog(
  legacyKey: string
): Promise<{ exercises: ExerciseRequestDto[]; syncedAt: number } | null> {
  try {
    const raw = await AsyncStorage.getItem(legacyKey);
    if (!raw) return null;
    const exercises = JSON.parse(raw) as ExerciseRequestDto[];
    if (!Array.isArray(exercises) || exercises.length === 0) {
      await AsyncStorage.removeItem(legacyKey);
      return null;
    }

    if (catalogHasBase64Images(exercises) || !catalogHasOnlyHttpImages(exercises)) {
      await AsyncStorage.removeItem(legacyKey);
      return null;
    }

    const lastSyncRaw = await AsyncStorage.getItem(EXERCISE_LAST_SYNC_KEY);
    const syncedAt = Number.parseInt(lastSyncRaw || "", 10);
    const resolvedSyncedAt = Number.isFinite(syncedAt) ? syncedAt : Date.now();

    await writeExerciseCatalog(exercises, resolvedSyncedAt, {
      fromOfflineCache: false,
    });
    await AsyncStorage.multiRemove([legacyKey, `${legacyKey}_from_cache`]);

    return { exercises, syncedAt: resolvedSyncedAt };
  } catch {
    return null;
  }
}

async function readCatalogFromDiskOnly(): Promise<ExerciseCatalogSnapshot | null> {
  try {
    const storedApiUrl = await AsyncStorage.getItem(EXERCISE_CACHE_API_URL_KEY);
    if (storedApiUrl && normalizeApiUrl(storedApiUrl) !== currentApiUrl()) {
      return null;
    }

    const raw = await AsyncStorage.getItem(EXERCISE_CACHE_KEY);
    if (raw) {
      const exercises = JSON.parse(raw) as ExerciseRequestDto[];
      if (Array.isArray(exercises) && exercises.length > 0) {
        const lastSyncRaw = await AsyncStorage.getItem(EXERCISE_LAST_SYNC_KEY);
        const syncedAt = Number.parseInt(lastSyncRaw || "", 10);
        const resolvedSyncedAt = Number.isFinite(syncedAt)
          ? syncedAt
          : Date.now();
        const fromOffline =
          (await AsyncStorage.getItem(EXERCISE_FROM_CACHE_FLAG_KEY)) === "true";
        return {
          exercises,
          syncedAt: resolvedSyncedAt,
          apiUrl: currentApiUrl(),
          fromOfflineCache: fromOffline,
        };
      }
    }

    for (const legacyKey of LEGACY_EXERCISE_CACHE_KEYS) {
      const legacy = await migrateLegacyCatalog(legacyKey);
      if (legacy) {
        return peekExerciseCatalogSnapshot();
      }
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Read catalog: memory → v4 → migrate HTTP-only v3/v2 → null.
 */
export async function readExerciseCatalog(): Promise<ExerciseCatalogSnapshot | null> {
  const peeked = peekExerciseCatalogSnapshot();
  if (peeked?.exercises.length) {
    return peeked;
  }

  try {
    const storedApiUrl = await AsyncStorage.getItem(EXERCISE_CACHE_API_URL_KEY);
    if (storedApiUrl && normalizeApiUrl(storedApiUrl) !== currentApiUrl()) {
      invalidateExerciseCatalogMemory();
      await AsyncStorage.multiRemove(allCatalogStorageKeys());
      return null;
    }

    const fromDisk = await readCatalogFromDiskOnly();
    if (fromDisk?.exercises.length) {
      setMemory(
        fromDisk.exercises,
        fromDisk.syncedAt,
        fromDisk.fromOfflineCache
      );
      return peekExerciseCatalogSnapshot();
    }
  } catch {
    return null;
  }

  return null;
}

export async function clearExerciseCatalogStorage(): Promise<void> {
  invalidateExerciseCatalogMemory();
  catalogWriteGeneration = 0;
  await AsyncStorage.multiRemove(allCatalogStorageKeys());
}
