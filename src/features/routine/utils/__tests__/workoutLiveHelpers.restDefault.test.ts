import { nextRestSecondsDefault } from "../workoutLiveHelpers";

describe("nextRestSecondsDefault", () => {
  it("extends total when adding rest time", () => {
    expect(nextRestSecondsDefault(90, 105, 15)).toBe(105);
    expect(nextRestSecondsDefault(90, 100, 15)).toBe(105);
  });

  it("shrinks total when subtracting but never below remaining", () => {
    expect(nextRestSecondsDefault(90, 75, -15)).toBe(75);
    expect(nextRestSecondsDefault(90, 80, -15)).toBe(80);
  });

  it("keeps at least 1 second for live progress math", () => {
    expect(nextRestSecondsDefault(0, 0, -15)).toBe(1);
  });
});
