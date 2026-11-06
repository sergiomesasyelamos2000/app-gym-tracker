import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RoutineSessionListItem } from "@sergiomesasyelamos2000/shared";
import {
  aggregateByDate,
  getExerciseProgressData,
  type ExerciseProgressDataPoint,
  type RoutineSession,
} from "../../../utils/statsHelpers";
import {
  loadRoutineSessionsOutcome,
  refreshRoutineSessionsOutcome,
} from "../services/routineService";

function toRoutineSessions(
  sessions: RoutineSessionListItem[]
): RoutineSession[] {
  return sessions.map((session) => ({
    ...session,
    createdAt:
      session.createdAt instanceof Date
        ? session.createdAt.toISOString()
        : String(session.createdAt ?? ""),
    exercises: (session.exercises ?? []).map((exercise) => ({
      exerciseId: exercise.exerciseId,
      name: exercise.name ?? "",
      sets: (exercise.sets ?? []).map((set) => ({
        weight: Number(set.weight) || 0,
        reps: Number(set.reps) || 0,
        completed: Boolean(set.completed),
      })),
    })),
  }));
}

export function useExerciseSessionHistory(exerciseId: string) {
  const [sessions, setSessions] = useState<RoutineSessionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [staleError, setStaleError] = useState(false);
  const requestIdRef = useRef(0);
  const sessionsRef = useRef<RoutineSessionListItem[]>([]);

  const applySessions = useCallback((next: RoutineSessionListItem[]) => {
    sessionsRef.current = next;
    setSessions(next);
    setError(false);
    setStaleError(false);
  }, []);

  const loadInitial = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const outcome = await loadRoutineSessionsOutcome();
      if (requestId !== requestIdRef.current) return;
      if (outcome.status === "unavailable") {
        sessionsRef.current = [];
        setSessions([]);
        setError(true);
        setStaleError(false);
        return;
      }
      applySessions(outcome.sessions);
    } catch {
      if (requestId !== requestIdRef.current) return;
      sessionsRef.current = [];
      setSessions([]);
      setError(true);
      setStaleError(false);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [applySessions]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial, exerciseId]);

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setRefreshing(true);
    try {
      const outcome = await refreshRoutineSessionsOutcome();
      if (requestId !== requestIdRef.current) return;
      if (outcome.status === "unavailable") {
        if (sessionsRef.current.length > 0) {
          setStaleError(true);
        } else {
          setError(true);
        }
        return;
      }
      applySessions(outcome.sessions);
    } catch {
      if (requestId !== requestIdRef.current) return;
      if (sessionsRef.current.length > 0) {
        setStaleError(true);
      } else {
        setError(true);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setRefreshing(false);
      }
    }
  }, [applySessions]);

  const retry = useCallback(async () => {
    await loadInitial();
  }, [loadInitial]);

  const normalizedSessions = useMemo(
    () => toRoutineSessions(sessions),
    [sessions]
  );

  const allProgressData = useMemo<ExerciseProgressDataPoint[]>(() => {
    if (!exerciseId) return [];
    return aggregateByDate(
      getExerciseProgressData(exerciseId, normalizedSessions)
    );
  }, [exerciseId, normalizedSessions]);

  return {
    sessions,
    normalizedSessions,
    allProgressData,
    loading,
    refreshing,
    error,
    staleError,
    refresh,
    retry,
  };
}
