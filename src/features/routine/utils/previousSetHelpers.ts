import type { RoutineSessionEntity } from "@sergiomesasyelamos2000/shared";

export type PreviousSetPerformance = {
  weight: number;
  reps: number;
  assistedReps?: number;
};

/** exerciseId → performance by set index (newest non-empty wins). */
export type PreviousSetLookup = Map<
  string,
  Array<PreviousSetPerformance | undefined>
>;

function sessionTime(session: RoutineSessionEntity): number {
  const raw = session.createdAt;
  const ms = raw instanceof Date ? raw.getTime() : Date.parse(String(raw));
  return Number.isFinite(ms) ? ms : 0;
}

function performanceFromSet(
  set: { weight?: unknown; reps?: unknown; assistedReps?: unknown }
): PreviousSetPerformance | null {
  const weight = Number(set.weight);
  const reps = Number(set.reps);
  if (!Number.isFinite(weight) || !Number.isFinite(reps)) return null;
  // Ignore empty placeholders — not real previous performance.
  if (weight <= 0 && reps <= 0) return null;

  const assistedReps = Number(set.assistedReps);
  return {
    weight,
    reps,
    assistedReps:
      Number.isFinite(assistedReps) && assistedReps > 0
        ? assistedReps
        : undefined,
  };
}

/**
 * Build a one-pass index of previous set performance.
 * Sort sessions once; fill each exercise/set from newest → oldest.
 */
export function buildPreviousSetLookup(
  previousSessions: RoutineSessionEntity[]
): PreviousSetLookup {
  const lookup: PreviousSetLookup = new Map();
  if (!previousSessions.length) return lookup;

  const sortedSessions = [...previousSessions].sort(
    (a, b) => sessionTime(b) - sessionTime(a)
  );

  for (const session of sortedSessions) {
    for (const exercise of session.exercises ?? []) {
      const exerciseId =
        exercise.exerciseId || (exercise as { id?: string }).id;
      if (!exerciseId || !exercise.sets?.length) continue;

      let row = lookup.get(exerciseId);
      if (!row) {
        row = [];
        lookup.set(exerciseId, row);
      }

      exercise.sets.forEach((set, setIndex) => {
        if (row![setIndex] != null) return;
        const perf = performanceFromSet(set);
        if (perf) {
          row![setIndex] = perf;
        }
      });
    }
  }

  return lookup;
}

export function getPreviousSetPerformanceFromLookup(
  lookup: PreviousSetLookup,
  exerciseId: string,
  setIndex: number
): PreviousSetPerformance | null {
  if (!exerciseId || setIndex < 0) return null;
  return lookup.get(exerciseId)?.[setIndex] ?? null;
}

/**
 * Last logged performance for an exercise set index from prior sessions.
 * Returns null when the exercise was never completed before.
 */
export function getPreviousSetPerformance(
  exerciseId: string,
  setIndex: number,
  previousSessions: RoutineSessionEntity[]
): PreviousSetPerformance | null {
  if (!exerciseId || setIndex < 0 || previousSessions.length === 0) {
    return null;
  }
  return getPreviousSetPerformanceFromLookup(
    buildPreviousSetLookup(previousSessions),
    exerciseId,
    setIndex
  );
}

export function formatPreviousMark(
  performance: PreviousSetPerformance | null | undefined,
  weightUnit = "kg"
): string | undefined {
  if (!performance) return undefined;
  const { weight, reps, assistedReps } = performance;
  if (!Number.isFinite(weight) || !Number.isFinite(reps)) return undefined;
  if (weight <= 0 && reps <= 0) return undefined;

  const base = `${weight}${weightUnit} x ${reps}`;
  if (typeof assistedReps === "number" && assistedReps > 0) {
    return `${base} (A:${assistedReps})`;
  }
  return base;
}
