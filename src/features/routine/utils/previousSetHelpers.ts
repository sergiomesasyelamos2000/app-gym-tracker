import type { RoutineSessionEntity } from "@sergiomesasyelamos2000/shared";

export type PreviousSetPerformance = {
  weight: number;
  reps: number;
  assistedReps?: number;
};

function sessionTime(session: RoutineSessionEntity): number {
  const raw = session.createdAt;
  const ms = raw instanceof Date ? raw.getTime() : Date.parse(String(raw));
  return Number.isFinite(ms) ? ms : 0;
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

  const sortedSessions = [...previousSessions].sort(
    (a, b) => sessionTime(b) - sessionTime(a)
  );

  for (const session of sortedSessions) {
    const exercise = session.exercises?.find(
      (ex) =>
        ex.exerciseId === exerciseId ||
        (ex as { id?: string }).id === exerciseId
    );
    if (!exercise?.sets?.length) continue;

    const set = exercise.sets[setIndex];
    if (!set) continue;

    const weight = Number(set.weight);
    const reps = Number(set.reps);
    if (!Number.isFinite(weight) || !Number.isFinite(reps)) continue;
    // Ignore empty placeholders — not real previous performance.
    if (weight <= 0 && reps <= 0) continue;

    const assistedRaw = (set as { assistedReps?: number }).assistedReps;
    const assistedReps = Number(assistedRaw);

    return {
      weight,
      reps,
      assistedReps:
        Number.isFinite(assistedReps) && assistedReps > 0
          ? assistedReps
          : undefined,
    };
  }

  return null;
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
