import {
  shouldAcceptWorkoutLiveClearRest,
  shouldAcceptWorkoutLiveWrite,
} from "../workoutLiveWriteGate";

describe("workoutLiveWriteGate", () => {
  it("accepts any write while open", () => {
    expect(shouldAcceptWorkoutLiveWrite("open", {})).toBe(true);
    expect(shouldAcceptWorkoutLiveWrite("open", { isPaused: false })).toBe(
      true
    );
  });

  it("while paused only accepts frozen snapshots", () => {
    expect(shouldAcceptWorkoutLiveWrite("paused", {})).toBe(false);
    expect(shouldAcceptWorkoutLiveWrite("paused", { isPaused: false })).toBe(
      false
    );
    expect(shouldAcceptWorkoutLiveWrite("paused", { isPaused: true })).toBe(
      true
    );
  });

  it("blocks clear-rest while paused so Omitir cannot unfreeze", () => {
    expect(shouldAcceptWorkoutLiveClearRest("open")).toBe(true);
    expect(shouldAcceptWorkoutLiveClearRest("paused")).toBe(false);
  });
});
