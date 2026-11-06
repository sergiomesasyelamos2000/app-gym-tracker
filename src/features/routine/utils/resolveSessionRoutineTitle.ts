import AsyncStorage from "@react-native-async-storage/async-storage";
import type { RoutineSessionEntity } from "@sergiomesasyelamos2000/shared";

const ROUTINES_CACHE_KEY = "@routines_cache";
const LOCAL_ROUTINES_KEY = "@local_routines";
const ROUTINE_ID_MAPPING_KEY = "@routine_id_mapping";

export type SessionRoutineRef = {
  routineId?: string;
  routine?: { id?: string; title?: string | null } | null;
};

type RoutineTitleSource = { id?: string; title?: string | null };

export function readRoutineTitle(
  session: SessionRoutineRef | null | undefined
): string | undefined {
  const title = session?.routine?.title;
  if (typeof title !== "string") return undefined;
  const trimmed = title.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function readRoutineId(
  session: SessionRoutineRef | null | undefined
): string | undefined {
  if (typeof session?.routineId === "string" && session.routineId.length > 0) {
    return session.routineId;
  }
  const nestedId = session?.routine?.id;
  if (typeof nestedId === "string" && nestedId.length > 0) {
    return nestedId;
  }
  return undefined;
}

export function resolveSessionRoutineTitle(
  session: SessionRoutineRef,
  titleByRoutineId: ReadonlyMap<string, string>
): string | undefined {
  const existing = readRoutineTitle(session);
  if (existing) return existing;
  const routineId = readRoutineId(session);
  if (!routineId) return undefined;
  const fromMap = titleByRoutineId.get(routineId);
  return fromMap && fromMap.trim().length > 0 ? fromMap.trim() : undefined;
}

export function attachRoutineSnapshot<T extends object>(
  session: T,
  ref: { id: string; title: string }
): T & SessionRoutineRef {
  const title = ref.title.trim();
  if (!title) {
    return { ...session, routineId: ref.id };
  }
  return {
    ...session,
    routineId: ref.id,
    routine: { id: ref.id, title },
  };
}

export function preserveClientRoutineTitle<T extends SessionRoutineRef>(
  saved: T,
  requested: SessionRoutineRef,
  routineId: string
): T {
  const title = readRoutineTitle(saved) || readRoutineTitle(requested);
  const id = readRoutineId(saved) || readRoutineId(requested) || routineId;
  if (!title) {
    return id ? { ...saved, routineId: id } : { ...saved };
  }
  return {
    ...saved,
    routineId: id,
    routine: { id: id!, title },
  };
}

export function stripRoutineForApi(
  session: Partial<RoutineSessionEntity> & { _isPending?: boolean }
): Partial<RoutineSessionEntity> {
  const {
    routine: _routine,
    id: _id,
    createdAt: _createdAt,
    _isPending: _pending,
    ...rest
  } = session;
  return rest;
}

export function buildRoutineTitleMap(
  routines: RoutineTitleSource[]
): Map<string, string> {
  const map = new Map<string, string>();
  for (const routine of routines) {
    if (!routine?.id) continue;
    if (map.has(routine.id)) continue;
    const title =
      typeof routine.title === "string" ? routine.title.trim() : "";
    if (!title) continue;
    map.set(routine.id, title);
  }
  return map;
}

export function healSessionRoutineTitle<T extends SessionRoutineRef>(
  session: T,
  titleByRoutineId: ReadonlyMap<string, string>
): T {
  if (readRoutineTitle(session)) return session;
  const resolved = resolveSessionRoutineTitle(session, titleByRoutineId);
  if (!resolved) return session;
  const id = readRoutineId(session);
  if (!id) return session;
  return {
    ...session,
    routineId: id,
    routine: { id, title: resolved },
  };
}

export async function loadRoutineTitleMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  const appendRoutines = (raw: string | null) => {
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as RoutineTitleSource[];
      if (!Array.isArray(parsed)) return;
      for (const [id, title] of buildRoutineTitleMap(parsed)) {
        if (!map.has(id)) map.set(id, title);
      }
    } catch {
      // ignore corrupt cache buckets
    }
  };

  appendRoutines(await AsyncStorage.getItem(ROUTINES_CACHE_KEY));
  appendRoutines(await AsyncStorage.getItem(LOCAL_ROUTINES_KEY));

  try {
    const mappingRaw = await AsyncStorage.getItem(ROUTINE_ID_MAPPING_KEY);
    if (mappingRaw) {
      const mapping = JSON.parse(mappingRaw) as Record<string, string>;
      if (mapping && typeof mapping === "object") {
        for (const [localId, serverId] of Object.entries(mapping)) {
          const localTitle = map.get(localId);
          const serverTitle = map.get(serverId);
          if (localTitle && !map.has(serverId)) map.set(serverId, localTitle);
          if (serverTitle && !map.has(localId)) map.set(localId, serverTitle);
        }
      }
    }
  } catch {
    // ignore corrupt mapping
  }

  return map;
}

export function coalesceSessionTitle<T extends SessionRoutineRef>(
  preferred: T,
  other: SessionRoutineRef
): T {
  if (readRoutineTitle(preferred)) return preferred;
  const otherTitle = readRoutineTitle(other);
  if (!otherTitle) return preferred;
  const id = readRoutineId(preferred) || readRoutineId(other);
  if (!id) return preferred;
  return {
    ...preferred,
    routineId: preferred.routineId || id,
    routine: { id, title: otherTitle },
  };
}
