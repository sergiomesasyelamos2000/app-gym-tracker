import { shiftRestEndAtMs } from "../workoutLiveHelpers";

describe("shiftRestEndAtMs", () => {
  it("preserves sub-second fractions when adding rest", () => {
    const previousEnd = 1_700_000_000_400;
    expect(shiftRestEndAtMs(previousEnd, 15)).toBe(previousEnd + 15_000);
  });

  it("preserves sub-second fractions when subtracting rest", () => {
    const previousEnd = 1_700_000_000_400;
    expect(shiftRestEndAtMs(previousEnd, -15)).toBe(previousEnd - 15_000);
  });

  it("two +15 taps equal one +30 from the original end", () => {
    const previousEnd = 1_700_000_000_250;
    const afterOne = shiftRestEndAtMs(previousEnd, 15);
    const afterTwo = shiftRestEndAtMs(afterOne, 15);
    expect(afterTwo).toBe(shiftRestEndAtMs(previousEnd, 30));
  });
});
