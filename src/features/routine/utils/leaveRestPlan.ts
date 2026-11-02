export type LeaveRestReason = "skip" | "expired";

/**
 * Plan side-effects for leaving rest (Omitir / timer expired).
 * Never ends the workout session — only clears rest UI / notifications / Live Activity rest mode.
 */
export function planLeaveRest(input: {
  reason: LeaveRestReason;
  nativeAlreadyUpdated: boolean;
  notificationId: string | null;
  epoch: number;
}): {
  cancelNotificationId: string | null;
  dismissNotificationId: string | null;
  /** When true, JS should call clearWorkoutRestLive (not endWorkoutLive). */
  syncLiveActivity: boolean;
  playFeedback: boolean;
  epoch: number;
} {
  return {
    cancelNotificationId: input.notificationId,
    dismissNotificationId: input.notificationId,
    syncLiveActivity: !input.nativeAlreadyUpdated,
    playFeedback: input.reason === "expired",
    epoch: input.epoch,
  };
}

export function shouldAbortLeaveSideEffects(
  epochAtLeave: number,
  currentEpoch: number
): boolean {
  return epochAtLeave !== currentEpoch;
}
