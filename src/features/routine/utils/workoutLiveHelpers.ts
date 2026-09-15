import type { SetRequestDto } from "@sergiomesasyelamos2000/shared";

/** Human-readable next-set line for Live Activity / FGS notification. */
export function buildNextSetSummary(
  setList: SetRequestDto[],
  afterSetId?: string | null
): string | null {
  const sorted = [...setList].sort(
    (a, b) =>
      (a.order ?? Number.MAX_SAFE_INTEGER) -
      (b.order ?? Number.MAX_SAFE_INTEGER)
  );

  let startIndex = 0;
  if (afterSetId) {
    const completedIndex = sorted.findIndex((set) => set.id === afterSetId);
    startIndex = completedIndex >= 0 ? completedIndex + 1 : 0;
  }

  const nextSet = sorted.slice(startIndex).find((set) => !set.completed);
  if (!nextSet) {
    const firstIncomplete = sorted.find((set) => !set.completed);
    if (!firstIncomplete) return null;
    return formatSetLine(firstIncomplete, sorted);
  }
  return formatSetLine(nextSet, sorted);
}

function formatSetLine(nextSet: SetRequestDto, sorted: SetRequestDto[]): string {
  const setNumber =
    typeof nextSet.order === "number"
      ? nextSet.order
      : sorted.indexOf(nextSet) + 1;
  const total = sorted.length;

  const weight =
    typeof nextSet.weight === "number" && Number.isFinite(nextSet.weight)
      ? `${nextSet.weight} kg`
      : null;
  const exactReps =
    typeof nextSet.reps === "number" && Number.isFinite(nextSet.reps)
      ? `${nextSet.reps}`
      : null;
  const rangedReps =
    typeof nextSet.repsMin === "number" && typeof nextSet.repsMax === "number"
      ? `${nextSet.repsMin}-${nextSet.repsMax}`
      : typeof nextSet.repsMin === "number"
        ? `${nextSet.repsMin}+`
        : typeof nextSet.repsMax === "number"
          ? `≤${nextSet.repsMax}`
          : null;
  const repsLabel = exactReps ?? rangedReps;

  const prescription =
    weight && repsLabel
      ? `${weight} x ${repsLabel}`
      : weight
        ? weight
        : repsLabel
          ? `${repsLabel} reps`
          : null;

  const base = `Next: set ${setNumber} of ${total}`;
  return prescription ? `${base} (${prescription})` : base;
}

/**
 * Fingerprint of Live Activity-relevant set state.
 * Includes next-set prescription fields so the widget stays accurate, but the
 * caller should debounce — typing still changes weight/reps.
 */
export function buildLiveCompletionFingerprint(
  sets: { [exerciseId: string]: SetRequestDto[] },
  preferredExerciseId?: string | null
): string {
  const parts: string[] = [`ex:${preferredExerciseId ?? ""}`];
  for (const exerciseId of Object.keys(sets).sort()) {
    const list = sets[exerciseId] || [];
    const sorted = [...list].sort(
      (a, b) =>
        (a.order ?? Number.MAX_SAFE_INTEGER) -
        (b.order ?? Number.MAX_SAFE_INTEGER)
    );
    // Only completed flags + identity of next incomplete set (not every keystroke
    // on already-completed rows). For the active next set, include prescription.
    let nextEncoded = "";
    const completedFlags = sorted
      .map((s) => {
        if (!s.completed && !nextEncoded) {
          nextEncoded = `${s.id}:${s.weight ?? ""}:${s.reps ?? ""}:${s.repsMin ?? ""}:${s.repsMax ?? ""}`;
        }
        return s.completed ? "1" : "0";
      })
      .join("");
    parts.push(`${exerciseId}:${completedFlags}>${nextEncoded}`);
  }
  return parts.join("|");
}

/** First incomplete set across exercises in list order. */
export function findNextIncompleteSet(params: {
  exercises: Array<{ id: string; name?: string; restSeconds?: string | number | null }>;
  sets: { [exerciseId: string]: SetRequestDto[] };
  preferredExerciseId?: string | null;
}): {
  exerciseId: string;
  exerciseName: string;
  set: SetRequestDto;
  restSeconds: number;
} | null {
  const { exercises, sets, preferredExerciseId } = params;
  const ordered = preferredExerciseId
    ? [
        ...exercises.filter((e) => e.id === preferredExerciseId),
        ...exercises.filter((e) => e.id !== preferredExerciseId),
      ]
    : exercises;

  for (const exercise of ordered) {
    const list = sets[exercise.id] || [];
    const sorted = [...list].sort(
      (a, b) =>
        (a.order ?? Number.MAX_SAFE_INTEGER) -
        (b.order ?? Number.MAX_SAFE_INTEGER)
    );
    const incomplete = sorted.find((s) => !s.completed);
    if (!incomplete) continue;
    const rawRest = exercise.restSeconds;
    const restSeconds =
      typeof rawRest === "number"
        ? rawRest
        : parseInt(String(rawRest || "90"), 10) || 90;
    return {
      exerciseId: exercise.id,
      exerciseName: exercise.name || "Ejercicio",
      set: incomplete,
      restSeconds,
    };
  }
  return null;
}
