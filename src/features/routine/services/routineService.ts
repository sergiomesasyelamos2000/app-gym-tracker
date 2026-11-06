import type {
  PaginatedRoutineSessions,
  RoutineFolderResponseDto,
  RoutineLayoutRequestDto,
  RoutineSessionEntity,
  RoutineSessionListItem,
  RoutineRequestDto,
  RoutineResponseDto,
} from "@sergiomesasyelamos2000/shared";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch } from "../../../api/client";
import type { CaughtError } from "../../../types";
import { enrichSessionExercisesWithCatalogImages } from "../utils/enrichSessionExerciseImages";
import {
  coalesceSessionTitle,
  healSessionRoutineTitle,
  loadRoutineTitleMap,
  readRoutineId,
} from "../utils/resolveSessionRoutineTitle";

const ROUTINES_CACHE_KEY = "@routines_cache";
const FOLDERS_CACHE_KEY = "@routine_folders_cache";
const SESSIONS_CACHE_KEY = "@sessions_cache_v2";
const LOCAL_SESSIONS_KEY = "@local_sessions";
const DEFAULT_SESSIONS_PAGE_SIZE = 50;
const MAX_SESSION_PAGES = 40; // safety ceiling: 40 × 50 = 2000 sessions

/** Bumped on logout so in-flight enrich cannot write the previous user's sessions. */
let sessionsCacheWriteEpoch = 0;

/**
 * Drop the sessions cache and invalidate in-flight persist writers.
 * Call from clearAuth / logout.
 */
export function invalidateRoutineSessionsCacheWrites(): void {
  sessionsCacheWriteEpoch += 1;
  void AsyncStorage.removeItem(SESSIONS_CACHE_KEY);
}

export async function saveRoutine(
  routineRequestDto: RoutineRequestDto
): Promise<RoutineResponseDto> {
  return await apiFetch<RoutineResponseDto>("routines", {
    method: "POST",
    body: JSON.stringify(routineRequestDto),
  });
}

async function readRoutinesCache(): Promise<RoutineResponseDto[] | null> {
  try {
    const cached = await AsyncStorage.getItem(ROUTINES_CACHE_KEY);
    if (cached == null) return null;
    const parsed = JSON.parse(cached);
    return Array.isArray(parsed) ? (parsed as RoutineResponseDto[]) : null;
  } catch (cacheError) {
    console.error("[RoutineService] Cache read failed:", cacheError);
    return null;
  }
}

/**
 * True when a routines snapshot exists locally (including an empty list).
 * False on first install / after logout purge before any successful fetch.
 */
export async function hasLocalRoutinesSnapshot(): Promise<boolean> {
  return (await readRoutinesCache()) !== null;
}

async function fetchAndCacheRoutines(): Promise<RoutineResponseDto[]> {
  const routines = await apiFetch<RoutineResponseDto[]>("routines", {
    method: "GET",
  });
  await AsyncStorage.setItem(ROUTINES_CACHE_KEY, JSON.stringify(routines));
  return routines;
}

/**
 * Offline-first: return local cache immediately when present; refresh from
 * network in the background. First install (no cache) awaits the network.
 */
export async function findAllRoutines(): Promise<RoutineResponseDto[]> {
  const cached = await readRoutinesCache();

  const networkPromise = fetchAndCacheRoutines().catch((error: CaughtError) => {
    console.warn("[RoutineService] Background routines refresh failed:", error);
    return null;
  });

  if (cached) {
    void networkPromise;
    return cached;
  }

  const fromNetwork = await networkPromise;
  if (fromNetwork) return fromNetwork;

  console.warn("[RoutineService] No cached routines available");
  return [];
}

async function readFoldersCache(): Promise<RoutineFolderResponseDto[] | null> {
  try {
    const cached = await AsyncStorage.getItem(FOLDERS_CACHE_KEY);
    if (cached == null) return null;
    const parsed = JSON.parse(cached);
    return Array.isArray(parsed)
      ? (parsed as RoutineFolderResponseDto[])
      : null;
  } catch (cacheError) {
    console.error("[RoutineService] Folders cache read failed:", cacheError);
    return null;
  }
}

async function fetchAndCacheFolders(): Promise<RoutineFolderResponseDto[]> {
  const folders = await apiFetch<RoutineFolderResponseDto[]>(
    "routines/folders",
    { method: "GET" }
  );
  await AsyncStorage.setItem(FOLDERS_CACHE_KEY, JSON.stringify(folders));
  return folders;
}

/** Offline-first folders list (same pattern as findAllRoutines). */
export async function fetchRoutineFolders(): Promise<RoutineFolderResponseDto[]> {
  const cached = await readFoldersCache();

  const networkPromise = fetchAndCacheFolders().catch((error: CaughtError) => {
    console.warn("[RoutineService] Background folders refresh failed:", error);
    return null;
  });

  if (cached) {
    void networkPromise;
    return cached;
  }

  const fromNetwork = await networkPromise;
  if (fromNetwork) return fromNetwork;

  console.warn("[RoutineService] No cached folders available");
  return [];
}

export async function createRoutineFolder(
  title: string
): Promise<RoutineFolderResponseDto> {
  const folder = await apiFetch<RoutineFolderResponseDto>("routines/folders", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
  try {
    const cached = await AsyncStorage.getItem(FOLDERS_CACHE_KEY);
    const list = cached
      ? (JSON.parse(cached) as RoutineFolderResponseDto[])
      : [];
    await AsyncStorage.setItem(
      FOLDERS_CACHE_KEY,
      JSON.stringify([folder, ...list.filter((f) => f.id !== folder.id)])
    );
  } catch {
    // ignore cache errors
  }
  return folder;
}

export async function renameRoutineFolder(
  id: string,
  title: string
): Promise<RoutineFolderResponseDto> {
  return await apiFetch<RoutineFolderResponseDto>(`routines/folders/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
}

export async function deleteRoutineFolder(id: string): Promise<void> {
  await apiFetch<void>(`routines/folders/${id}`, {
    method: "DELETE",
  });
}

export async function saveRoutineLayout(
  layout: RoutineLayoutRequestDto
): Promise<void> {
  await apiFetch<void>("routines/layout", {
    method: "PUT",
    body: JSON.stringify(layout),
  });

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
    console.error("[RoutineService] Failed to update folders cache:", cacheError);
  }
}

export async function getRoutineById(id: string): Promise<RoutineResponseDto> {
  // Cache-first for faster routine detail opening.
  const routineFromIndividualCache = await getRoutineFromIndividualCache(id);
  if (routineFromIndividualCache) {
    return routineFromIndividualCache;
  }

  const routineFromLocalCache = await getRoutineFromLocalCache(id);
  if (routineFromLocalCache) {
    return routineFromLocalCache;
  }

  try {
    const routine = await apiFetch<RoutineResponseDto>(`routines/${id}`, {
      method: "GET",
    });

    // Cache individual routine (includes full exercises)
    await cacheIndividualRoutine(routine);

    return routine;
  } catch (error: CaughtError) {
    // Try main cache as last resort (might not have full details)
    const routineFromMainCache = await getRoutineFromMainCache(id);
    if (routineFromMainCache) {
      return routineFromMainCache;
    }

    console.error(`[RoutineService] Routine ${id} not found in any cache`);
    throw new Error("No se pudo cargar la rutina. Verifica tu conexión.");
  }
}

/**
 * Cache individual routine for offline access
 */
async function cacheIndividualRoutine(
  routine: RoutineResponseDto
): Promise<void> {
  try {
    const INDIVIDUAL_CACHE_KEY = `@routine_${routine.id}`;
    await AsyncStorage.setItem(INDIVIDUAL_CACHE_KEY, JSON.stringify(routine));
  } catch (error) {
    console.error(
      "[RoutineService] Failed to cache individual routine:",
      error
    );
  }
}

/**
 * Get routine from individual cache (@routine_{id})
 */
async function getRoutineFromIndividualCache(
  id: string
): Promise<RoutineResponseDto | null> {
  try {
    const INDIVIDUAL_CACHE_KEY = `@routine_${id}`;
    const cached = await AsyncStorage.getItem(INDIVIDUAL_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);

      return parsed;
    }
  } catch (error) {
    console.error(
      "[RoutineService] Failed to read from individual cache:",
      error
    );
  }
  return null;
}

/**
 * Get routine from main cache (@routines_cache)
 */
async function getRoutineFromMainCache(
  id: string
): Promise<RoutineResponseDto | null> {
  try {
    const cached = await AsyncStorage.getItem(ROUTINES_CACHE_KEY);
    if (cached) {
      const routines: RoutineResponseDto[] = JSON.parse(cached);
      const routine = routines.find((r) => r.id === id);

      return routine || null;
    }
  } catch (error) {
    console.error("[RoutineService] Failed to read from main cache:", error);
  }
  return null;
}

/**
 * Get routine from local cache (@local_routines)
 */
async function getRoutineFromLocalCache(
  id: string
): Promise<RoutineResponseDto | null> {
  try {
    const LOCAL_ROUTINES_KEY = "@local_routines";
    const cached = await AsyncStorage.getItem(LOCAL_ROUTINES_KEY);
    if (cached) {
      const routines: RoutineResponseDto[] = JSON.parse(cached);
      const routine = routines.find((r) => r.id === id);

      return routine || null;
    }
  } catch (error) {
    console.error("[RoutineService] Failed to read from local cache:", error);
  }
  return null;
}

export async function updateRoutineById(
  id: string,
  routineRequestDto: RoutineRequestDto
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

export async function reorderRoutines(routineIds: string[]): Promise<void> {
  await apiFetch<void>("routines/reorder", {
    method: "PUT",
    body: JSON.stringify({ routineIds }),
  });

  // Keep offline cache aligned with the new server order.
  try {
    const cached = await AsyncStorage.getItem(ROUTINES_CACHE_KEY);
    if (!cached) return;

    const routines = JSON.parse(cached) as RoutineResponseDto[];
    const byId = new Map(routines.map((routine) => [routine.id, routine]));
    const ordered: RoutineResponseDto[] = [];
    routineIds.forEach((id, index) => {
      const routine = byId.get(id);
      if (!routine) return;
      ordered.push({ ...routine, sortOrder: index });
    });

    // Append any cached routines missing from the reorder payload.
    routines.forEach((routine) => {
      if (!routineIds.includes(routine.id)) {
        ordered.push(routine);
      }
    });

    await AsyncStorage.setItem(ROUTINES_CACHE_KEY, JSON.stringify(ordered));
  } catch (cacheError) {
    console.error("[RoutineService] Failed to update reorder cache:", cacheError);
  }
}

export async function deleteRoutine(id: string): Promise<void> {
  await apiFetch<void>(`routines/${id}`, {
    method: "DELETE",
  });
}

export async function saveRoutineSession(
  id: string,
  session: Partial<RoutineSessionEntity>
): Promise<RoutineSessionEntity> {
  return await apiFetch<RoutineSessionEntity>(`routines/${id}/sessions`, {
    method: "POST",
    body: JSON.stringify(session),
  });
}

export async function findRoutineSessionsPage(options?: {
  limit?: number;
  cursor?: string | null;
}): Promise<PaginatedRoutineSessions> {
  const limit = options?.limit ?? DEFAULT_SESSIONS_PAGE_SIZE;
  const params = new URLSearchParams({ limit: String(limit) });
  if (options?.cursor) {
    params.set("cursor", options.cursor);
  }
  return apiFetch<PaginatedRoutineSessions>(
    `routines/sessions?${params.toString()}`,
    { method: "GET" }
  );
}

/**
 * Reads `@sessions_cache_v2`. Returns null when missing, corrupt, or non-array.
 * An empty array is a valid cached empty history.
 */
export async function readCachedRoutineSessions(): Promise<
  RoutineSessionListItem[] | null
> {
  try {
    const cached = await AsyncStorage.getItem(SESSIONS_CACHE_KEY);
    if (cached == null) {
      return null;
    }
    const parsed = JSON.parse(cached);
    if (!Array.isArray(parsed)) {
      return null;
    }
    return parsed as RoutineSessionListItem[];
  } catch (cacheError) {
    console.error("[RoutineService] Sessions cache read failed:", cacheError);
    return null;
  }
}

/**
 * Fetches remaining session pages after an already-loaded first page cursor.
 * No enrich and no cache write — Home first-paint path only.
 */
export async function findRoutineSessionsAfter(
  cursor: string
): Promise<RoutineSessionListItem[]> {
  let apiSessions: RoutineSessionListItem[] = [];
  let nextCursor: string | null = cursor;
  let pages = 0;
  const maxPages = MAX_SESSION_PAGES - 1;

  while (nextCursor && pages < maxPages) {
    const page = await findRoutineSessionsPage({
      limit: DEFAULT_SESSIONS_PAGE_SIZE,
      cursor: nextCursor,
    });
    apiSessions = [...apiSessions, ...page.items];
    nextCursor = page.hasMore ? page.nextCursor : null;
    pages += 1;
  }

  return apiSessions;
}

/**
 * Enrich session media then write the full list to `@sessions_cache_v2`.
 * Never call with a partial first page. Skips the write if logout invalidated
 * the cache while enrich was in flight.
 */
export async function persistEnrichedSessionsCache(
  sessions: RoutineSessionListItem[]
): Promise<RoutineSessionListItem[]> {
  const writeEpoch = sessionsCacheWriteEpoch;
  const enriched = await enrichRoutineSessionsMedia(sessions);
  if (writeEpoch !== sessionsCacheWriteEpoch) {
    return enriched;
  }
  await AsyncStorage.setItem(SESSIONS_CACHE_KEY, JSON.stringify(enriched));
  return enriched;
}

/** All pages, no enrich / no cache write — for Home background with epoch guards. */
export async function fetchAllRoutineSessionsUncached(): Promise<
  RoutineSessionListItem[]
> {
  let apiSessions: RoutineSessionListItem[] = [];
  let cursor: string | null = null;
  let pages = 0;
  do {
    const page = await findRoutineSessionsPage({
      limit: DEFAULT_SESSIONS_PAGE_SIZE,
      cursor,
    });
    apiSessions = [...apiSessions, ...page.items];
    cursor = page.hasMore ? page.nextCursor : null;
    pages += 1;
  } while (cursor && pages < MAX_SESSION_PAGES);
  return apiSessions;
}

/**
 * Fetches session history (paginated under the hood). Returns slim list items
 * compatible with previous RoutineSessionEntity consumers for sets/history UX.
 */
async function readLocalPendingSessions(): Promise<RoutineSessionListItem[]> {
  try {
    const localStr = await AsyncStorage.getItem(LOCAL_SESSIONS_KEY);
    if (!localStr) return [];
    const parsed = JSON.parse(localStr);
    return Array.isArray(parsed) ? (parsed as RoutineSessionListItem[]) : [];
  } catch (loadError) {
    console.error("[RoutineService] Failed to load local sessions:", loadError);
    return [];
  }
}

function mergeSessions(
  localSessions: RoutineSessionListItem[],
  remoteOrCached: RoutineSessionListItem[]
): RoutineSessionListItem[] {
  const result: RoutineSessionListItem[] = [];
  const indexById = new Map<string, number>();

  for (const session of [...localSessions, ...remoteOrCached]) {
    if (!session?.id) continue;
    const existingIndex = indexById.get(session.id);
    if (existingIndex === undefined) {
      indexById.set(session.id, result.length);
      result.push(session);
      continue;
    }
    // Keep the first (local) body; copy routine.title only when local title is blank.
    result[existingIndex] = coalesceSessionTitle(
      result[existingIndex],
      session
    );
  }

  return result;
}

function healSessionsWithTitleMap<T extends RoutineSessionListItem>(
  sessions: T[],
  titleMap: ReadonlyMap<string, string>
): T[] {
  return sessions.map((session) => healSessionRoutineTitle(session, titleMap));
}

function collectSessionTitlePatches(
  sessions: RoutineSessionListItem[]
): Map<string, { id: string; title: string }> {
  const patches = new Map<string, { id: string; title: string }>();
  for (const session of sessions) {
    if (!session?.id) continue;
    const title = session.routine?.title?.trim();
    const routineId = readRoutineId(session);
    if (!title || !routineId) continue;
    patches.set(session.id, { id: routineId, title });
  }
  return patches;
}

function applyTitlePatchesToList<T extends RoutineSessionListItem>(
  list: T[],
  patches: ReadonlyMap<string, { id: string; title: string }>
): { sessions: T[]; changed: boolean } {
  let changed = false;
  const sessions = list.map((session) => {
    if (!session?.id) return session;
    const patch = patches.get(session.id);
    if (!patch) return session;
    if (session.routine?.title?.trim()) return session;
    changed = true;
    return {
      ...session,
      routineId: session.routineId || patch.id,
      routine: { id: patch.id, title: patch.title },
    };
  });
  return { sessions, changed };
}

/**
 * Re-read cache keys and patch blank titles by session id.
 * Never writes a stale in-memory snapshot captured before awaits.
 */
async function persistHealedTitlePatches(args: {
  writeEpochAtStart: number;
  patches: ReadonlyMap<string, { id: string; title: string }>;
  routineId?: string;
}): Promise<void> {
  if (args.patches.size === 0) return;
  if (args.writeEpochAtStart !== sessionsCacheWriteEpoch) return;

  try {
    const local = await readLocalPendingSessions();
    const patchedLocal = applyTitlePatchesToList(local, args.patches);
    if (args.writeEpochAtStart !== sessionsCacheWriteEpoch) return;
    if (patchedLocal.changed) {
      await AsyncStorage.setItem(
        LOCAL_SESSIONS_KEY,
        JSON.stringify(patchedLocal.sessions)
      );
    }

    const global = await readCachedRoutineSessions();
    if (global) {
      const patchedGlobal = applyTitlePatchesToList(global, args.patches);
      if (args.writeEpochAtStart !== sessionsCacheWriteEpoch) return;
      if (patchedGlobal.changed) {
        await AsyncStorage.setItem(
          SESSIONS_CACHE_KEY,
          JSON.stringify(patchedGlobal.sessions)
        );
      }
    }

    if (args.routineId) {
      const perRoutine = await readPerRoutineSessionsCache(args.routineId);
      if (perRoutine) {
        const patchedPerRoutine = applyTitlePatchesToList(
          perRoutine as unknown as RoutineSessionListItem[],
          args.patches
        );
        if (args.writeEpochAtStart !== sessionsCacheWriteEpoch) return;
        if (patchedPerRoutine.changed) {
          await AsyncStorage.setItem(
            routineSessionCacheKey(args.routineId),
            JSON.stringify(patchedPerRoutine.sessions)
          );
        }
      }
    }
  } catch (error) {
    console.error(
      "[RoutineService] Failed to write healed session titles:",
      error
    );
  }
}

/**
 * Drop a session id from `@local_sessions`, `@sessions_cache_v2`, and
 * matching per-routine caches (including mapped local/server routine ids).
 */
export async function removeRoutineSessionFromCaches(
  sessionId: string
): Promise<void> {
  if (!sessionId) return;

  let routineIds = new Set<string>();

  const dropFromList = <T extends { id?: string; routineId?: string; routine?: { id?: string } }>(
    list: T[]
  ): T[] => {
    const next: T[] = [];
    for (const row of list) {
      if (row?.id === sessionId) {
        const rid = readRoutineId(row);
        if (rid) routineIds.add(rid);
        continue;
      }
      next.push(row);
    }
    return next;
  };

  try {
    const localStr = await AsyncStorage.getItem(LOCAL_SESSIONS_KEY);
    if (localStr) {
      const parsed = JSON.parse(localStr);
      if (Array.isArray(parsed)) {
        await AsyncStorage.setItem(
          LOCAL_SESSIONS_KEY,
          JSON.stringify(dropFromList(parsed as RoutineSessionListItem[]))
        );
      }
    }
  } catch (error) {
    console.error("[RoutineService] Failed to remove from @local_sessions:", error);
  }

  try {
    const globalStr = await AsyncStorage.getItem(SESSIONS_CACHE_KEY);
    if (globalStr) {
      const parsed = JSON.parse(globalStr);
      if (Array.isArray(parsed)) {
        await AsyncStorage.setItem(
          SESSIONS_CACHE_KEY,
          JSON.stringify(dropFromList(parsed as RoutineSessionListItem[]))
        );
      }
    }
  } catch (error) {
    console.error(
      "[RoutineService] Failed to remove from @sessions_cache_v2:",
      error
    );
  }

  try {
    const mappingStr = await AsyncStorage.getItem("@routine_id_mapping");
    if (mappingStr) {
      const mapping = JSON.parse(mappingStr) as Record<string, string>;
      for (const [localId, serverId] of Object.entries(mapping)) {
        if (routineIds.has(localId)) routineIds.add(serverId);
        if (routineIds.has(serverId)) routineIds.add(localId);
      }
    }
  } catch {
    // ignore corrupt mapping
  }

  for (const routineId of routineIds) {
    try {
      const existing = await readPerRoutineSessionsCache(routineId);
      if (!existing) continue;
      const next = existing.filter((s) => s.id !== sessionId);
      if (next.length === existing.length) continue;
      await AsyncStorage.setItem(
        routineSessionCacheKey(routineId),
        JSON.stringify(next)
      );
    } catch (error) {
      console.error(
        `[RoutineService] Failed to remove session from routine cache ${routineId}:`,
        error
      );
    }
  }
}

export type RoutineSessionsLoadOutcome =
  | { status: "ok"; sessions: RoutineSessionListItem[] }
  | { status: "unavailable"; sessions: [] };

/**
 * Same offline-first path as findAllRoutineSessions, but distinguishes a true
 * empty history (`ok` + []) from network failure with nothing local (`unavailable`).
 */
export async function loadRoutineSessionsOutcome(): Promise<RoutineSessionsLoadOutcome> {
  // Capture before any await so logout during in-flight work can invalidate writes.
  const writeEpochAtStart = sessionsCacheWriteEpoch;
  const cached = await readCachedRoutineSessions();
  const localSessions = await readLocalPendingSessions();

  const networkPromise = (async () => {
    const apiSessions = await fetchAllRoutineSessionsUncached();
    if (writeEpochAtStart !== sessionsCacheWriteEpoch) {
      return apiSessions;
    }
    // Keep unsynced local workouts in the cache write, not only the API page.
    const locals = await readLocalPendingSessions();
    return persistEnrichedSessionsCache(mergeSessions(locals, apiSessions));
  })().catch((error: CaughtError) => {
    console.warn("[RoutineService] Background sessions refresh failed:", error);
    return null;
  });

  const titleMap = await loadRoutineTitleMap();

  if (cached) {
    void networkPromise;
    const merged = mergeSessions(localSessions, cached);
    const healedMerged = healSessionsWithTitleMap(merged, titleMap);
    await persistHealedTitlePatches({
      writeEpochAtStart,
      patches: collectSessionTitlePatches(healedMerged),
    });
    return {
      status: "ok",
      sessions: await enrichRoutineSessionsMedia(healedMerged),
    };
  }

  const fromNetwork = await networkPromise;
  if (fromNetwork) {
    const merged = mergeSessions(localSessions, fromNetwork);
    const healedMerged = healSessionsWithTitleMap(merged, titleMap);
    await persistHealedTitlePatches({
      writeEpochAtStart,
      patches: collectSessionTitlePatches(healedMerged),
    });
    return { status: "ok", sessions: healedMerged };
  }

  if (localSessions.length > 0) {
    const healedLocal = healSessionsWithTitleMap(localSessions, titleMap);
    await persistHealedTitlePatches({
      writeEpochAtStart,
      patches: collectSessionTitlePatches(healedLocal),
    });
    return {
      status: "ok",
      sessions: await enrichRoutineSessionsMedia(healedLocal),
    };
  }

  console.warn("[RoutineService] No cached sessions available");
  return { status: "unavailable", sessions: [] };
}

/**
 * Forced network refresh for pull-to-refresh. Always merges pending local
 * sessions so offline workouts do not disappear from Progress / Detail.
 */
export async function refreshRoutineSessionsOutcome(): Promise<RoutineSessionsLoadOutcome> {
  const writeEpochAtStart = sessionsCacheWriteEpoch;
  const localSessions = await readLocalPendingSessions();
  const titleMap = await loadRoutineTitleMap();

  try {
    const apiSessions = await fetchAllRoutineSessionsUncached();
    if (writeEpochAtStart !== sessionsCacheWriteEpoch) {
      return {
        status: "ok",
        sessions: await enrichRoutineSessionsMedia(
          mergeSessions(localSessions, apiSessions)
        ),
      };
    }
    const merged = mergeSessions(localSessions, apiSessions);
    const healedMerged = healSessionsWithTitleMap(merged, titleMap);
    await persistHealedTitlePatches({
      writeEpochAtStart,
      patches: collectSessionTitlePatches(healedMerged),
    });
    return {
      status: "ok",
      sessions: await persistEnrichedSessionsCache(healedMerged),
    };
  } catch (error: CaughtError) {
    console.warn("[RoutineService] Forced sessions refresh failed:", error);
    if (localSessions.length > 0) {
      return {
        status: "ok",
        sessions: await enrichRoutineSessionsMedia(
          healSessionsWithTitleMap(localSessions, titleMap)
        ),
      };
    }
    const cached = await readCachedRoutineSessions();
    if (cached && cached.length > 0) {
      return {
        status: "ok",
        sessions: await enrichRoutineSessionsMedia(
          healSessionsWithTitleMap(
            mergeSessions(localSessions, cached),
            titleMap
          )
        ),
      };
    }
    return { status: "unavailable", sessions: [] };
  }
}

/**
 * Offline-first session history: serve cache (+ pending local) immediately,
 * refresh from network in the background when a cache exists.
 */
export async function findAllRoutineSessions(): Promise<
  RoutineSessionListItem[]
> {
  const outcome = await loadRoutineSessionsOutcome();
  return outcome.sessions;
}

async function enrichRoutineSessionsMedia(
  sessions: RoutineSessionListItem[]
): Promise<RoutineSessionListItem[]> {
  return Promise.all(
    sessions.map(async (session) => {
      const exercises = await enrichSessionExercisesWithCatalogImages(
        session.exercises ?? []
      );
      return { ...session, exercises };
    })
  );
}

/**
 * Slim session rows for burned-kcal / TDEE insights (no exercises payload).
 * Falls back to mapping full sessions if the burn endpoint is unavailable.
 */
export async function findSessionBurnSummaries(): Promise<
  Array<{ id?: string; createdAt?: string | Date | null; caloriesBurned?: number | null }>
> {
  try {
    return await apiFetch("routines/sessions?fields=burn", { method: "GET" });
  } catch {
    const sessions = await findAllRoutineSessions().catch(() => []);
    return sessions.map((s) => ({
      id: s.id,
      createdAt: s.createdAt,
      caloriesBurned: (s as { caloriesBurned?: number | null }).caloriesBurned,
    }));
  }
}

function routineSessionCacheKey(routineId: string): string {
  return `@sessions_routine_${routineId}`;
}

function sessionBelongsToRoutine(
  session: { routineId?: string; routine?: { id?: string } },
  routineId: string
): boolean {
  return (
    session.routineId === routineId || session.routine?.id === routineId
  );
}

function mergeSessionEntities(
  ...lists: Array<RoutineSessionEntity[] | null | undefined>
): RoutineSessionEntity[] {
  const byId = new Map<string, RoutineSessionEntity>();
  for (const list of lists) {
    if (!list) continue;
    for (const session of list) {
      if (!session?.id) continue;
      const existing = byId.get(session.id);
      if (!existing) {
        byId.set(session.id, session);
        continue;
      }
      // Last list wins body; keep prior title when the newer row has none.
      byId.set(session.id, coalesceSessionTitle(session, existing));
    }
  }
  return Array.from(byId.values()).sort((a, b) => {
    const ta =
      a.createdAt instanceof Date
        ? a.createdAt.getTime()
        : Date.parse(String(a.createdAt));
    const tb =
      b.createdAt instanceof Date
        ? b.createdAt.getTime()
        : Date.parse(String(b.createdAt));
    return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
  });
}

async function readPerRoutineSessionsCache(
  routineId: string
): Promise<RoutineSessionEntity[] | null> {
  try {
    const raw = await AsyncStorage.getItem(routineSessionCacheKey(routineId));
    if (raw == null) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RoutineSessionEntity[]) : null;
  } catch (cacheError) {
    console.error("[RoutineService] Sessions cache read failed:", cacheError);
    return null;
  }
}

/**
 * Persist a completed session into all local SoTs used by Home, Progress,
 * and previous-set marks (Hevy-style device history).
 */
export async function upsertRoutineSessionCaches(
  session: RoutineSessionEntity
): Promise<void> {
  if (!session?.id) return;

  const routineId = session.routineId || session.routine?.id;

  try {
    const localStr = await AsyncStorage.getItem(LOCAL_SESSIONS_KEY);
    const localList: RoutineSessionEntity[] = localStr
      ? (JSON.parse(localStr) as RoutineSessionEntity[])
      : [];
    const without = localList.filter((s) => s.id !== session.id);
    await AsyncStorage.setItem(
      LOCAL_SESSIONS_KEY,
      JSON.stringify([session, ...without])
    );
  } catch (error) {
    console.error("[RoutineService] Failed to upsert @local_sessions:", error);
  }

  if (routineId) {
    try {
      const existing = (await readPerRoutineSessionsCache(routineId)) ?? [];
      const next = mergeSessionEntities([session], existing);
      await AsyncStorage.setItem(
        routineSessionCacheKey(routineId),
        JSON.stringify(next)
      );
    } catch (error) {
      console.error(
        "[RoutineService] Failed to upsert per-routine sessions cache:",
        error
      );
    }
  }

  try {
    const globalCached = (await readCachedRoutineSessions()) ?? [];
    const asListItem = session as unknown as RoutineSessionListItem;
    const nextGlobal = mergeSessions([asListItem], globalCached);
    await AsyncStorage.setItem(SESSIONS_CACHE_KEY, JSON.stringify(nextGlobal));
  } catch (error) {
    console.error(
      "[RoutineService] Failed to upsert @sessions_cache_v2:",
      error
    );
  }
}

/**
 * Offline-first sessions for one routine (previous-set marks + detail history).
 * Merges per-routine cache, pending local sessions, and global history cache.
 */
export type FindRoutineSessionsOptions = {
  /** Called when the network refresh merges a newer snapshot (local-first path). */
  onNetworkUpdate?: (sessions: RoutineSessionEntity[]) => void;
};

export async function findRoutineSessions(
  id: string,
  options?: FindRoutineSessionsOptions
): Promise<RoutineSessionEntity[]> {
  const perRoutine = await readPerRoutineSessionsCache(id);
  const localAll = await readLocalPendingSessions();
  const localForRoutine = (
    localAll as unknown as RoutineSessionEntity[]
  ).filter((s) => sessionBelongsToRoutine(s, id));

  const globalCached = await readCachedRoutineSessions();
  const globalForRoutine = (
    (globalCached ?? []) as unknown as RoutineSessionEntity[]
  ).filter((s) => sessionBelongsToRoutine(s, id));

  const localMerged = mergeSessionEntities(
    perRoutine,
    localForRoutine,
    globalForRoutine
  );
  const hasLocalSnapshot =
    perRoutine != null ||
    localForRoutine.length > 0 ||
    globalForRoutine.length > 0;

  const writeEpochAtStart = sessionsCacheWriteEpoch;

  const networkPromise = apiFetch<RoutineSessionEntity[]>(
    `routines/${id}/sessions`,
    { method: "GET" }
  )
    .then(async (sessions) => {
      await AsyncStorage.setItem(
        routineSessionCacheKey(id),
        JSON.stringify(sessions)
      );
      const merged = mergeSessionEntities(sessions, localForRoutine);
      options?.onNetworkUpdate?.(merged);
      return sessions;
    })
    .catch((error: CaughtError) => {
      console.warn(
        `[RoutineService] Background sessions refresh failed for ${id}:`,
        error
      );
      return null;
    });

  const titleMap = await loadRoutineTitleMap();

  if (hasLocalSnapshot) {
    void networkPromise;
    const healedMerged = healSessionsWithTitleMap(
      localMerged as unknown as RoutineSessionListItem[],
      titleMap
    );
    await persistHealedTitlePatches({
      writeEpochAtStart,
      patches: collectSessionTitlePatches(healedMerged),
      routineId: id,
    });
    return healedMerged as unknown as RoutineSessionEntity[];
  }

  const fromNetwork = await networkPromise;
  if (fromNetwork) {
    const merged = mergeSessionEntities(fromNetwork, localForRoutine);
    const healedMerged = healSessionsWithTitleMap(
      merged as unknown as RoutineSessionListItem[],
      titleMap
    );
    await persistHealedTitlePatches({
      writeEpochAtStart,
      patches: collectSessionTitlePatches(healedMerged),
      routineId: id,
    });
    return healedMerged as unknown as RoutineSessionEntity[];
  }

  console.warn(`[RoutineService] No cached sessions for routine ${id}`);
  const healedLocal = healSessionsWithTitleMap(
    localForRoutine as unknown as RoutineSessionListItem[],
    titleMap
  );
  await persistHealedTitlePatches({
    writeEpochAtStart,
    patches: collectSessionTitlePatches(healedLocal),
    routineId: id,
  });
  return healedLocal as unknown as RoutineSessionEntity[];
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

type RawGlobalStatsResponse = Partial<GlobalStats> & {
  totalTime?: unknown;
  totalWeight?: unknown;
  completedSets?: unknown;
};

const toSafeNumber = (value: unknown): number => {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;

  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeGlobalStats = (raw: RawGlobalStatsResponse): GlobalStats => ({
  totalRoutines: toSafeNumber(raw.totalRoutines),
  totalSessions: toSafeNumber(raw.totalSessions),
  totalVolume: toSafeNumber(raw.totalVolume ?? raw.totalWeight),
  totalDuration: toSafeNumber(raw.totalDuration ?? raw.totalTime),
  averageSessionDuration:
    raw.averageSessionDuration === undefined
      ? undefined
      : toSafeNumber(raw.averageSessionDuration),
  mostUsedExercises: Array.isArray(raw.mostUsedExercises)
    ? raw.mostUsedExercises
    : undefined,
  weeklyProgress: Array.isArray(raw.weeklyProgress) ? raw.weeklyProgress : undefined,
});

export async function getGlobalStats(): Promise<GlobalStats> {
  try {
    // Try to fetch from API
    const response = await apiFetch<RawGlobalStatsResponse>(
      "routines/stats/global",
      {
        method: "GET",
      }
    );

    return normalizeGlobalStats(response);
  } catch (error: CaughtError) {
    // If API fails, calculate from local sessions
    const sessions = await findAllRoutineSessions();

    const stats: GlobalStats = {
      totalRoutines: 0, // Would need to fetch routines separately
      totalSessions: sessions.length,
      totalVolume: sessions.reduce(
        (sum, s) => sum + toSafeNumber(s.totalWeight),
        0
      ),
      totalDuration: sessions.reduce((sum, s) => sum + toSafeNumber(s.totalTime), 0),
    };

    return stats;
  }
}

export const reorderRoutineExercises = async (
  routineId: string,
  exerciseIds: string[]
): Promise<void> => {
  await apiFetch<void>(`routines/${routineId}/reorder`, {
    method: "PUT",
    body: JSON.stringify({ exerciseIds }),
  });
};
