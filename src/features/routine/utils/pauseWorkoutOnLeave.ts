/**
 * Whether leaving RoutineDetail should pause the in-progress workout
 * (persist + freeze Live Activity) instead of discarding it.
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

/** Fields sent to Live Activity / notification so the clock freezes in place. */
export function buildPausedLiveFields(durationSeconds: number): {
  isPaused: true;
  pausedElapsedSeconds: number;
  isResting: false;
  restEndAtMs: null;
} {
  return {
    isPaused: true,
    pausedElapsedSeconds: Math.max(0, Math.floor(durationSeconds)),
    isResting: false,
    restEndAtMs: null,
  };
}

/** Matches ActivityKit / Chronometer style: m:ss or h:mm:ss. */
export function formatElapsedClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
