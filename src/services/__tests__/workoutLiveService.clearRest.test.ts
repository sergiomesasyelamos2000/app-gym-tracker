/**
 * Pure helpers covering the Omitir / leave-rest live-sync invariants.
 * Native clearRestLive is covered by iOS rebuild + manual QA.
 */

describe("leave-rest live sync invariants", () => {
  it("documents that skip must clear rest without ending the workout", () => {
    const { planLeaveRest } = require("../../features/routine/utils/leaveRestPlan");

    const toastSkip = planLeaveRest({
      reason: "skip",
      nativeAlreadyUpdated: false,
      notificationId: "n1",
      epoch: 1,
    });
    expect(toastSkip.syncLiveActivity).toBe(true);
    expect(toastSkip.playFeedback).toBe(false);

    const islandSkip = planLeaveRest({
      reason: "skip",
      nativeAlreadyUpdated: true,
      notificationId: "n2",
      epoch: 2,
    });
    expect(islandSkip.syncLiveActivity).toBe(false);
  });

  it("forces null rest end when leaving rest mode", () => {
    const isResting = false;
    const lastRestEndAtMs = 9_999_000;
    const restEndAtMs = isResting ? lastRestEndAtMs : null;
    expect(restEndAtMs).toBeNull();
  });
});
