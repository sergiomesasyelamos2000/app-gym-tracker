export type LeaveRestReason = "skip" | "expired";

export function planLeaveRest(input: {
  reason: LeaveRestReason;
  nativeAlreadyUpdated: boolean;
  notificationId: string | null;
  epoch: number;
}): {
  cancelNotificationId: string | null;
  syncLiveActivity: boolean;
  playFeedback: boolean;
  epoch: number;
} {
  return {
    cancelNotificationId: input.notificationId,
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
