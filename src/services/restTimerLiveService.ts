/**
 * Back-compat re-exports. Prefer importing from workoutLiveService.
 */
export {
  startRestTimerLive,
  updateRestTimerLive,
  endRestTimerLive,
  getCurrentRestTimerLiveState,
  consumeAppTerminatedAt,
  pollNativeIntent,
  subscribeToRestTimerIntents,
  subscribeToWorkoutLiveIntents,
  startWorkoutLive,
  updateWorkoutLive,
  endWorkoutLive,
  consumePendingCompleteSet,
} from "./workoutLiveService";

export type {
  RestTimerLiveState,
  WorkoutLiveIntentEvent,
  WorkoutLiveIntentAction,
  WorkoutLiveSnapshot,
} from "./workoutLiveService";
