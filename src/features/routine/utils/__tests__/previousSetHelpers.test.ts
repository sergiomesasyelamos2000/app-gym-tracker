import {
  buildPreviousSetLookup,
  formatPreviousMark,
  getPreviousSetPerformance,
  getPreviousSetPerformanceFromLookup,
} from "../previousSetHelpers";
import type { RoutineSessionEntity } from "@sergiomesasyelamos2000/shared";

function session(
  id: string,
  createdAt: string,
  exercises: RoutineSessionEntity["exercises"]
): RoutineSessionEntity {
  return {
    id,
    routineId: "r1",
    exercises,
    totalTime: 60,
    totalWeight: 0,
    completedSets: 1,
    createdAt,
  } as RoutineSessionEntity;
}

describe("buildPreviousSetLookup", () => {
  it("indexes newest session per exercise set", () => {
    const sessions = [
      session("old", "2026-01-01T00:00:00.000Z", [
        {
          exerciseId: "e1",
          name: "Squat",
          sets: [{ weight: 40, reps: 8, completed: true }],
        },
      ]),
      session("new", "2026-10-01T00:00:00.000Z", [
        {
          exerciseId: "e1",
          name: "Squat",
          sets: [{ weight: 50, reps: 10, completed: true }],
        },
      ]),
    ];

    const lookup = buildPreviousSetLookup(sessions);
    expect(getPreviousSetPerformanceFromLookup(lookup, "e1", 0)).toEqual({
      weight: 50,
      reps: 10,
      assistedReps: undefined,
    });
    expect(getPreviousSetPerformance("e1", 0, sessions)).toEqual({
      weight: 50,
      reps: 10,
      assistedReps: undefined,
    });
  });

  it("keeps bodyweight 0kg x N", () => {
    const sessions = [
      session("s1", "2026-10-01T00:00:00.000Z", [
        {
          exerciseId: "e2",
          name: "Pull-up",
          sets: [{ weight: 0, reps: 12, completed: true }],
        },
      ]),
    ];
    const lookup = buildPreviousSetLookup(sessions);
    const perf = getPreviousSetPerformanceFromLookup(lookup, "e2", 0);
    expect(perf).toEqual({ weight: 0, reps: 12, assistedReps: undefined });
    expect(formatPreviousMark(perf)).toBe("0kg x 12");
  });

  it("fills missing set indexes from older sessions", () => {
    const sessions = [
      session("new", "2026-10-02T00:00:00.000Z", [
        {
          exerciseId: "e1",
          name: "Bench",
          sets: [{ weight: 60, reps: 5, completed: true }],
        },
      ]),
      session("old", "2026-10-01T00:00:00.000Z", [
        {
          exerciseId: "e1",
          name: "Bench",
          sets: [
            { weight: 55, reps: 5, completed: true },
            { weight: 55, reps: 5, completed: true },
          ],
        },
      ]),
    ];
    const lookup = buildPreviousSetLookup(sessions);
    expect(getPreviousSetPerformanceFromLookup(lookup, "e1", 0)?.weight).toBe(
      60
    );
    expect(getPreviousSetPerformanceFromLookup(lookup, "e1", 1)?.weight).toBe(
      55
    );
  });
});
