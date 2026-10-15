import {
  buildPausedWorkoutPatch,
  shouldPauseWorkoutOnLeave,
} from "../pauseWorkoutOnLeave";

describe("shouldPauseWorkoutOnLeave", () => {
  it("pauses when an active workout leaves the detail screen", () => {
    expect(
      shouldPauseWorkoutOnLeave({
        started: true,
        sessionView: false,
        isSaving: false,
      })
    ).toBe(true);
  });

  it("does not pause for session view, idle, or saving", () => {
    expect(
      shouldPauseWorkoutOnLeave({
        started: false,
        sessionView: false,
        isSaving: false,
      })
    ).toBe(false);
    expect(
      shouldPauseWorkoutOnLeave({
        started: true,
        sessionView: true,
        isSaving: false,
      })
    ).toBe(false);
    expect(
      shouldPauseWorkoutOnLeave({
        started: true,
        sessionView: false,
        isSaving: true,
      })
    ).toBe(false);
  });
});

describe("buildPausedWorkoutPatch", () => {
  it("stores non-negative floored duration and pausedAt", () => {
    expect(
      buildPausedWorkoutPatch({ durationSeconds: 125.9, pausedAtMs: 1000 })
    ).toEqual({ duration: 125, pausedAt: 1000 });
    expect(
      buildPausedWorkoutPatch({ durationSeconds: -3, pausedAtMs: 50 })
    ).toEqual({ duration: 0, pausedAt: 50 });
  });
});
