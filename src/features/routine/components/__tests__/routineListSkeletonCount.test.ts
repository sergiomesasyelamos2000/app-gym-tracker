import { getRoutineSkeletonCount } from "../RoutineListSkeleton";

describe("getRoutineSkeletonCount", () => {
  it("clamps short phones to 2 cards", () => {
    expect(getRoutineSkeletonCount(640)).toBe(2);
  });

  it("returns 3 cards for mid heights", () => {
    expect(getRoutineSkeletonCount(800)).toBe(3);
  });

  it("caps at 4 cards on tall screens", () => {
    expect(getRoutineSkeletonCount(920)).toBe(4);
    expect(getRoutineSkeletonCount(2000, 4)).toBe(4);
  });

  it("respects a lower fallback max", () => {
    expect(getRoutineSkeletonCount(800, 1)).toBe(1);
  });
});
