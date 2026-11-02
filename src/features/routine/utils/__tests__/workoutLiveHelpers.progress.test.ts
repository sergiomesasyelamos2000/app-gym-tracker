import type { SetRequestDto } from "@sergiomesasyelamos2000/shared";
import { buildWorkoutLiveProgress } from "../workoutLiveHelpers";

const set = (id: string, order: number, completed: boolean) =>
  ({ id, order, completed }) as SetRequestDto;

const exercises = [{ id: "a" }, { id: "b" }, { id: "c" }];
const sets = {
  a: [set("a1", 1, true), set("a2", 2, true)],
  b: [set("b1", 1, true), set("b2", 2, false), set("b3", 3, false)],
  c: [],
};

describe("buildWorkoutLiveProgress", () => {
  it("returns 1-based exercise position and set counts for the current exercise", () => {
    expect(
      buildWorkoutLiveProgress({
        exercises,
        sets,
        exerciseId: "b",
        routineName: "Pecho y tríceps",
      })
    ).toEqual({
      routineName: "Pecho y tríceps",
      exerciseIndex: 2,
      exerciseCount: 3,
      completedSets: 1,
      totalSets: 3,
    });
  });

  it("returns nulls for the exercise fields when the exercise is unknown", () => {
    expect(
      buildWorkoutLiveProgress({ exercises, sets, exerciseId: "zzz" })
    ).toEqual({
      routineName: null,
      exerciseIndex: null,
      exerciseCount: 3,
      completedSets: null,
      totalSets: null,
    });
  });

  it("reports zero sets for an exercise without sets", () => {
    const progress = buildWorkoutLiveProgress({
      exercises,
      sets,
      exerciseId: "c",
    });
    expect(progress.completedSets).toBe(0);
    expect(progress.totalSets).toBe(0);
  });

  it("trims the routine name and drops blank names", () => {
    expect(
      buildWorkoutLiveProgress({ exercises, sets, routineName: "  Pierna  " })
        .routineName
    ).toBe("Pierna");
    expect(
      buildWorkoutLiveProgress({ exercises, sets, routineName: "   " })
        .routineName
    ).toBeNull();
  });

  it("returns null exercise count for an empty routine", () => {
    expect(
      buildWorkoutLiveProgress({ exercises: [], sets: {} }).exerciseCount
    ).toBeNull();
  });
});
