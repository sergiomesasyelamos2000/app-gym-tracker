import {
  planLeaveRest,
  shouldAbortLeaveSideEffects,
} from "../leaveRestPlan";

describe("planLeaveRest", () => {
  it("skip cancels and dismisses the notification, skips feedback, and syncs live activity", () => {
    expect(
      planLeaveRest({
        reason: "skip",
        nativeAlreadyUpdated: false,
        notificationId: "rest-42",
        epoch: 7,
      })
    ).toEqual({
      cancelNotificationId: "rest-42",
      dismissNotificationId: "rest-42",
      syncLiveActivity: true,
      playFeedback: false,
      epoch: 7,
    });
  });

  it("expired plays feedback, syncs live activity, and cancels/dismisses the notification", () => {
    expect(
      planLeaveRest({
        reason: "expired",
        nativeAlreadyUpdated: false,
        notificationId: "rest-99",
        epoch: 3,
      })
    ).toEqual({
      cancelNotificationId: "rest-99",
      dismissNotificationId: "rest-99",
      syncLiveActivity: true,
      playFeedback: true,
      epoch: 3,
    });
  });

  it("does not sync live activity when native already updated, but still cancels/dismisses", () => {
    expect(
      planLeaveRest({
        reason: "skip",
        nativeAlreadyUpdated: true,
        notificationId: "rest-1",
        epoch: 11,
      })
    ).toEqual({
      cancelNotificationId: "rest-1",
      dismissNotificationId: "rest-1",
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

  it("returns null cancel and dismiss ids when there is no notification", () => {
    expect(
      planLeaveRest({
        reason: "skip",
        nativeAlreadyUpdated: false,
        notificationId: null,
        epoch: 1,
      })
    ).toMatchObject({
      cancelNotificationId: null,
      dismissNotificationId: null,
    });

    expect(
      planLeaveRest({
        reason: "expired",
        nativeAlreadyUpdated: false,
        notificationId: null,
        epoch: 2,
      })
    ).toMatchObject({
      cancelNotificationId: null,
      dismissNotificationId: null,
    });
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
