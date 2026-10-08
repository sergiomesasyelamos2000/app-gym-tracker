import {
  planLeaveRest,
  shouldAbortLeaveSideEffects,
} from "../leaveRestPlan";

describe("planLeaveRest", () => {
  it("skip cancels the notification, skips feedback, and syncs live activity", () => {
    expect(
      planLeaveRest({
        reason: "skip",
        nativeAlreadyUpdated: false,
        notificationId: "rest-42",
        epoch: 7,
      })
    ).toEqual({
      cancelNotificationId: "rest-42",
      syncLiveActivity: true,
      playFeedback: false,
      epoch: 7,
    });
  });

  it("expired plays feedback, syncs live activity, and cancels the notification", () => {
    expect(
      planLeaveRest({
        reason: "expired",
        nativeAlreadyUpdated: false,
        notificationId: "rest-99",
        epoch: 3,
      })
    ).toEqual({
      cancelNotificationId: "rest-99",
      syncLiveActivity: true,
      playFeedback: true,
      epoch: 3,
    });
  });

  it("does not sync live activity when native already updated, but still cancels the notification", () => {
    expect(
      planLeaveRest({
        reason: "skip",
        nativeAlreadyUpdated: true,
        notificationId: "rest-1",
        epoch: 11,
      })
    ).toEqual({
      cancelNotificationId: "rest-1",
      syncLiveActivity: false,
      playFeedback: false,
      epoch: 11,
    });

    expect(
      planLeaveRest({
        reason: "expired",
        nativeAlreadyUpdated: true,
        notificationId: "rest-2",
        epoch: 12,
      }).syncLiveActivity
    ).toBe(false);
  });

  it("returns a null cancel id when there is no notification", () => {
    expect(
      planLeaveRest({
        reason: "skip",
        nativeAlreadyUpdated: false,
        notificationId: null,
        epoch: 1,
      }).cancelNotificationId
    ).toBeNull();

    expect(
      planLeaveRest({
        reason: "expired",
        nativeAlreadyUpdated: false,
        notificationId: null,
        epoch: 2,
      }).cancelNotificationId
    ).toBeNull();
  });
});

describe("shouldAbortLeaveSideEffects", () => {
  it("aborts when the epoch changed after leave started", () => {
    expect(shouldAbortLeaveSideEffects(4, 5)).toBe(true);
  });

  it("continues when the epoch is unchanged", () => {
    expect(shouldAbortLeaveSideEffects(4, 4)).toBe(false);
  });
});
