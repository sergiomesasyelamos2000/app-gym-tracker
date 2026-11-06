import {
  comparisonCaption,
  formatKg,
  formatSignedPercent,
  heroInsight,
  teaserCopy,
} from "../exerciseProgressCopy";
import {
  compareWithPreviousPeriod,
  type ExerciseProgressDataPoint,
  type ProgressStats,
} from "../../../../utils/statsHelpers";

const baseStats = (overrides: Partial<ProgressStats> = {}): ProgressStats => ({
  bestWeight: 80,
  averageWeight: 75,
  best1RM: 95,
  average1RM: 90,
  totalVolume: 12500,
  totalSessions: 6,
  trend: "up",
  ...overrides,
});

const point = (
  dateKey: string,
  maxWeight: number
): ExerciseProgressDataPoint => ({
  date: `${dateKey}T00:00:00`,
  maxWeight,
  totalReps: 10,
  totalSets: 3,
  totalVolume: maxWeight * 10,
  estimated1RM: maxWeight * 1.1,
});

describe("exerciseProgressCopy", () => {
  it("formats kg without tonnes or k suffix", () => {
    expect(formatKg(80)).toBe("80 kg");
    expect(formatKg(80.5)).toBe("80,5 kg");
    expect(formatKg(12500)).toBe("12.500 kg");
    expect(formatKg(12500)).not.toMatch(/toneladas?|\bt\b|\bk\b/i);
  });

  it("formats signed percents in es-ES", () => {
    expect(formatSignedPercent(4.2)).toBe("+4,2 %");
    expect(formatSignedPercent(-4.2)).toBe("-4,2 %");
    expect(formatSignedPercent(0)).toBe("0,0 %");
  });

  it("uses hero thresholds from session count and trend", () => {
    expect(heroInsight(baseStats({ totalSessions: 5, trend: "up" }))).toBe(
      "Aún hay pocas sesiones para ver si subes de peso."
    );
    expect(heroInsight(baseStats({ trend: "up" }))).toBe(
      "Vas subiendo de peso en este periodo."
    );
    expect(heroInsight(baseStats({ trend: "down" }))).toBe(
      "Has bajado de peso en este periodo."
    );
    expect(heroInsight(baseStats({ trend: "stable" }))).toBe(
      "Tu peso se mantiene parecido en este periodo."
    );
  });

  it("labels Todo comparison as vs the previous 30 days", () => {
    expect(comparisonCaption(0, 4.2)).toBe(
      "vs los 30 días anteriores: +4,2 %"
    );
    expect(comparisonCaption(30, null)).toBe(
      "vs periodo anterior: sin datos para comparar"
    );
  });

  it("builds teaser lines for empty, stale-30d, and active windows", () => {
    const now = new Date(2024, 5, 30);
    const empty = teaserCopy(
      0,
      compareWithPreviousPeriod([], 30, now)
    );
    expect(empty.disabled).toBe(true);
    expect(empty.line1).toContain("Todavía no hay sesiones");

    const olderOnly = teaserCopy(
      1,
      compareWithPreviousPeriod([point("2024-01-01", 70)], 30, now)
    );
    expect(olderOnly.line1).toContain("No hay sesiones en los últimos 30 días");
    expect(olderOnly.disabled).toBe(false);

    const active = teaserCopy(
      2,
      compareWithPreviousPeriod(
        [point("2024-05-15", 70), point("2024-06-20", 80)],
        30,
        now
      )
    );
    expect(active.line2).toContain("Mejor peso:");
    expect(active.line2).toContain("kg");
    expect(active.line2).not.toMatch(/toneladas?|\bt\b/i);
  });
});

