/**
 * Local calendar date key (YYYY-MM-DD) for diary / session day matching.
 */
export function toLocalDateKey(value: string | Date): string {
  const parsed = value instanceof Date ? value : new Date(value);

  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  if (typeof value === "string" && value.includes("T")) {
    return value.split("T")[0];
  }

  return typeof value === "string" ? value : "";
}

export type SessionWithBurn = {
  createdAt?: string | Date | null;
  caloriesBurned?: number | null;
};

/**
 * Precompute burned kcal per local day — O(n) once, then O(1) lookups.
 */
export function buildBurnedCaloriesByDate(
  sessions: SessionWithBurn[]
): Record<string, number> {
  const byDate: Record<string, number> = {};
  if (!sessions?.length) return byDate;

  for (const session of sessions) {
    if (!session.createdAt) continue;
    const burned = Number(session.caloriesBurned);
    if (!Number.isFinite(burned) || burned <= 0) continue;
    const key = toLocalDateKey(session.createdAt);
    if (!key) continue;
    byDate[key] = (byDate[key] || 0) + burned;
  }

  return byDate;
}

/**
 * Sum caloriesBurned from workout sessions that fall on the given local date.
 */
export function sumCaloriesBurnedForDate(
  sessions: SessionWithBurn[],
  dateKey: string
): number {
  if (!dateKey || !sessions?.length) return 0;
  return buildBurnedCaloriesByDate(sessions)[dateKey] || 0;
}

/**
 * Daily energy budget after accounting for workout burn.
 * remaining = goal + burned - consumed
 */
export function computeDailyEnergyBudget(params: {
  consumed: number;
  target: number;
  burned?: number;
}): {
  burned: number;
  effectiveTarget: number;
  remaining: number;
  percentage: number;
} {
  const burned = Math.max(0, Math.round(params.burned ?? 0));
  const target = Math.max(0, params.target || 0);
  const consumed = Math.max(0, params.consumed || 0);
  const effectiveTarget = target + burned;
  const remaining = effectiveTarget - consumed;
  const percentage =
    effectiveTarget > 0
      ? Math.min(100, (consumed / effectiveTarget) * 100)
      : 0;

  return { burned, effectiveTarget, remaining, percentage };
}
