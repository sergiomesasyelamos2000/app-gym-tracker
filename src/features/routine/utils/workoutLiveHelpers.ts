import type { SetRequestDto } from "@sergiomesasyelamos2000/shared";
import type { WorkoutLiveProgress } from "../../../services/workoutLiveImage";

/** Planned prescription from the routine template (before workout zeros weight/reps). */
export type TemplateSetPrescription = {
  weight?: number | null;
  reps?: number | null;
  repsMin?: number | null;
  repsMax?: number | null;
};

export type NextSetSummaryOptions = {
  /**
   * Routine-template prescription for the next set (0-based index in sorted list).
   * Used when the live set still has workout-start placeholders (0/0).
   */
  getTemplatePrescription?: (
    set: SetRequestDto,
    sortedIndex: number
  ) => TemplateSetPrescription | null | undefined;
  weightUnit?: string;
};

/** Routine name, exercise position and set counts for the Live Activity. */
export function buildWorkoutLiveProgress(params: {
  exercises: Array<{ id: string }>;
  sets: { [exerciseId: string]: SetRequestDto[] };
  exerciseId?: string | null;
  routineName?: string | null;
}): Required<WorkoutLiveProgress> {
  const { exercises, sets, exerciseId, routineName } = params;
  const index = exerciseId
    ? exercises.findIndex((exercise) => exercise.id === exerciseId)
    : -1;
  const setList = index >= 0 ? sets[exercises[index].id] || [] : null;

  return {
    routineName: routineName?.trim() || null,
    exerciseIndex: index >= 0 ? index + 1 : null,
    exerciseCount: exercises.length > 0 ? exercises.length : null,
    completedSets: setList ? setList.filter((s) => s.completed).length : null,
    totalSets: setList ? setList.length : null,
  };
}

/**
 * Live Activity `restSecondsDefault` after a ±15 (or any) rest delta.
 * Keeps progress duration ≥ remaining so Island countdown ranges stay valid.
 */
export function nextRestSecondsDefault(
  previousTotal: number,
  newRemainingSeconds: number,
  deltaSeconds: number
): number {
  const prev = Number.isFinite(previousTotal) ? previousTotal : 0;
  const remaining = Math.max(
    0,
    Math.floor(
      Number.isFinite(newRemainingSeconds) ? newRemainingSeconds : 0
    )
  );
  const next = Math.max(0, prev + deltaSeconds);
  return Math.max(next, remaining, 1);
}

/**
 * Shift an absolute rest end by ±N seconds without rebasing on Date.now().
 * Preserves sub-second fractions so toast and Live Activity share one instant.
 */
export function shiftRestEndAtMs(
  previousEndAtMs: number,
  deltaSeconds: number
): number {
  return previousEndAtMs + deltaSeconds * 1000;
}

/** Human-readable next-set line for Live Activity / FGS notification. */
export function buildNextSetSummary(
  setList: SetRequestDto[],
  afterSetId?: string | null,
  options?: NextSetSummaryOptions
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
    // No incomplete set after the one just completed → caller shows "Próximo ejercicio".
    return null;
  }
  return formatSetLine(nextSet, sorted, options);
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatRepsRange(
  source: {
    repsMin?: number | null;
    repsMax?: number | null;
  } | null | undefined
): string | null {
  if (!source) return null;
  const min = finiteNumber(source.repsMin);
  const max = finiteNumber(source.repsMax);
  if (min != null && max != null) return `${min}-${max}`;
  if (min != null) return `${min}+`;
  if (max != null) return `≤${max}`;
  return null;
}

/**
 * Resolve display weight/reps for the upcoming set.
 * Workout start zeros weight/reps → prefer typed values, else routine template.
 */
export function resolveNextSetPrescription(
  nextSet: SetRequestDto,
  template?: TemplateSetPrescription | null,
  weightUnit = "kg"
): string | null {
  const typedWeight = finiteNumber(nextSet.weight);
  const typedReps = finiteNumber(nextSet.reps);
  const hasTypedReps = typedReps != null && typedReps > 0;
  const hasTypedWeight = typedWeight != null && typedWeight > 0;

  const templateWeight = finiteNumber(template?.weight);
  const templateReps = finiteNumber(template?.reps);
  const hasTemplateReps = templateReps != null && templateReps > 0;
  const hasTemplateWeight = templateWeight != null && templateWeight > 0;

  let weightValue: number | null = null;
  if (hasTypedWeight) {
    weightValue = typedWeight;
  } else if (hasTypedReps && typedWeight != null) {
    // Explicit bodyweight entry: 0 kg x N
    weightValue = typedWeight;
  } else if (hasTemplateWeight) {
    weightValue = templateWeight;
  } else if (hasTemplateReps && templateWeight != null) {
    weightValue = templateWeight;
  }

  // Reps: typed → template exact → range on live set or template (plantilla).
  const rangedReps =
    formatRepsRange(nextSet) ?? formatRepsRange(template ?? undefined);

  let repsLabel: string | null = null;
  if (hasTypedReps) {
    repsLabel = `${typedReps}`;
  } else if (hasTemplateReps) {
    repsLabel = `${templateReps}`;
  } else if (rangedReps) {
    repsLabel = rangedReps;
  }

  const weightLabel =
    weightValue != null ? `${weightValue} ${weightUnit}` : null;

  if (weightLabel && repsLabel) return `${weightLabel} x ${repsLabel}`;
  if (weightLabel) return weightLabel;
  if (repsLabel) return `${repsLabel} reps`;
  return null;
}

function formatSetLine(
  nextSet: SetRequestDto,
  sorted: SetRequestDto[],
  options?: NextSetSummaryOptions
): string {
  const setNumber =
    typeof nextSet.order === "number"
      ? nextSet.order
      : sorted.indexOf(nextSet) + 1;
  const total = sorted.length;
  const sortedIndex = sorted.indexOf(nextSet);
  const template = options?.getTemplatePrescription?.(nextSet, sortedIndex);
  const unit = options?.weightUnit?.trim() || "kg";
  const prescription = resolveNextSetPrescription(nextSet, template, unit);

  const base = `Serie ${setNumber} de ${total}`;
  if (!prescription) return base;
  // Keep a consistent parseable shape for Live Activity UI:
  // "Serie N de T (W kg x R)" — widget turns this into Hevy-style rows.
  return `${base} (${prescription})`;
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
