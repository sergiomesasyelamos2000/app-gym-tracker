import {
  compareWithPreviousPeriod,
  metricDeltaFromComparison,
  normalizeExerciseAnalysisPeriod,
  percentDelta,
  type ExerciseProgressDataPoint,
} from "../statsHelpers";

const point = (
  dateKey: string,
  maxWeight: number,
  extras: Partial<ExerciseProgressDataPoint> = {}
): ExerciseProgressDataPoint => ({
  date: `${dateKey}T00:00:00`,
  maxWeight,
  totalReps: 10,
  totalSets: 3,
  totalVolume: maxWeight * 10,
  estimated1RM: maxWeight * 1.1,
  ...extras,
});

describe("percentDelta", () => {
  it("returns null when previous is 0 or non-finite", () => {
    expect(percentDelta(80, 0)).toBeNull();
    expect(percentDelta(80, Number.NaN)).toBeNull();
  });

  it("computes relative change", () => {
    expect(percentDelta(110, 100)).toBeCloseTo(10);
    expect(percentDelta(90, 100)).toBeCloseTo(-10);
  });
});

describe("normalizeExerciseAnalysisPeriod", () => {
  it("accepts known periods and defaults to 30", () => {
    expect(normalizeExerciseAnalysisPeriod(7)).toBe(7);
    expect(normalizeExerciseAnalysisPeriod(0)).toBe(0);
    expect(normalizeExerciseAnalysisPeriod(99)).toBe(30);
    expect(normalizeExerciseAnalysisPeriod(undefined)).toBe(30);
  });
});

describe("compareWithPreviousPeriod", () => {
  const now = new Date(2024, 5, 30, 15, 0, 0); // local June 30 2024

  it("uses a 30-day window when period is Todo (0)", () => {
    const data = [
      point("2024-05-15", 70), // previous window
      point("2024-06-20", 80), // current window
    ];

    const comparison = compareWithPreviousPeriod(data, 0, now);
    expect(comparison.windowDays).toBe(30);
    expect(comparison.currentStats.bestWeight).toBe(80);
    expect(comparison.previousStats.bestWeight).toBe(70);
    expect(comparison.weightDelta).toBeCloseTo(((80 - 70) / 70) * 100);
  });

  it("returns null deltas when the previous window has no baseline", () => {
    const data = [point("2024-06-20", 80)];
    const comparison = compareWithPreviousPeriod(data, 30, now);
    expect(comparison.weightDelta).toBeNull();
    expect(comparison.volumeDelta).toBeNull();
    expect(metricDeltaFromComparison(comparison, "weight")).toBeNull();
  });

  it("uses local-day cutoffs so late-evening now still includes today", () => {
    // Current window for 30 days ending June 30 is June 1..June 30.
    // Previous window is May 2..May 31.
    const data = [point("2024-06-30", 85), point("2024-05-15", 75)];
    const comparison = compareWithPreviousPeriod(data, 30, now);
    expect(comparison.currentStats.bestWeight).toBe(85);
    expect(comparison.previousStats.bestWeight).toBe(75);
  });
});

