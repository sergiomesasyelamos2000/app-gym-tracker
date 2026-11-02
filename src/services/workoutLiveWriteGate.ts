export type WorkoutLiveWriteGate = "open" | "paused";

/**
 * After leave-to-pause, only frozen (isPaused) snapshots may update Live Activity.
 * Resume/start unlocks the gate so the clock can run again.
 */
export function shouldAcceptWorkoutLiveWrite(
  gate: WorkoutLiveWriteGate,
  snapshot: { isPaused?: boolean }
): boolean {
  if (gate === "open") return true;
  return Boolean(snapshot.isPaused);
}

export function shouldAcceptWorkoutLiveClearRest(
  gate: WorkoutLiveWriteGate
): boolean {
  return gate === "open";
}
