import {
  buildPausedLiveFields,
  buildPausedWorkoutPatch,
  formatElapsedClock,
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

describe("buildPausedLiveFields", () => {
  it("freezes elapsed seconds and clears rest mode for Live Activity", () => {
    expect(buildPausedLiveFields(125.9)).toEqual({
      isPaused: true,
      pausedElapsedSeconds: 125,
      isResting: false,
      restEndAtMs: null,
    });
    expect(buildPausedLiveFields(-2)).toEqual({
      isPaused: true,
      pausedElapsedSeconds: 0,
      isResting: false,
      restEndAtMs: null,
    });
  });
});

describe("formatElapsedClock", () => {
  it("formats under and over one hour like the Live Activity clock", () => {
    expect(formatElapsedClock(65)).toBe("1:05");
    expect(formatElapsedClock(3661)).toBe("1:01:01");
    expect(formatElapsedClock(-5)).toBe("0:00");
  });
});
