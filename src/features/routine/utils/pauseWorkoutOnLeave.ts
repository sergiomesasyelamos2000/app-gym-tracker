/**
 * Whether leaving RoutineDetail should pause the in-progress workout
 * (persist + end Live Activity) instead of discarding it.
 */
export function shouldPauseWorkoutOnLeave(input: {
  started: boolean;
  sessionView: boolean;
  isSaving: boolean;
}): boolean {
  return input.started && !input.sessionView && !input.isSaving;
}

export function buildPausedWorkoutPatch(input: {
  durationSeconds: number;
  pausedAtMs: number;
}): { duration: number; pausedAt: number } {
  return {
    duration: Math.max(0, Math.floor(input.durationSeconds)),
    pausedAt: input.pausedAtMs,
  };
}
