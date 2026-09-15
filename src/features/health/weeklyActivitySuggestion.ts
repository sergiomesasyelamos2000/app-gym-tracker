import {
  buildBurnedCaloriesByDate,
  toLocalDateKey,
  type SessionWithBurn,
} from "../nutrition/utils/dailyEnergyBudget";
import type { ActivityLevel } from "@sergiomesasyelamos2000/shared";

const ACTIVITY_ORDER: ActivityLevel[] = [
  "sedentary",
  "lightly_active",
  "moderately_active",
  "very_active",
  "extra_active",
];

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentario",
  lightly_active: "Ligero",
  moderately_active: "Moderado",
  very_active: "Muy activo",
  extra_active: "Extra activo",
};

export type WeeklyActivitySuggestion = {
  daysWithWorkouts: number;
  totalBurnedLast7Days: number;
  avgDailyBurn: number;
  /** Suggested bump to daily calorie target (kcal), or 0 if none. */
  suggestedCalorieBump: number;
  suggestedActivityLevel: ActivityLevel | null;
  currentActivityLevel: ActivityLevel;
  message: string;
};

function listLast7DateKeys(now = new Date()): string[] {
  const keys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - i);
    keys.push(toLocalDateKey(d));
  }
  return keys;
}

function nextActivityLevel(current: ActivityLevel): ActivityLevel | null {
  const idx = ACTIVITY_ORDER.indexOf(current);
  if (idx < 0 || idx >= ACTIVITY_ORDER.length - 1) return null;
  return ACTIVITY_ORDER[idx + 1];
}

/**
 * Suggest a modest TDEE / activity bump from the last 7 days of workout burn.
 * Conservative: only suggests when there are enough training days and meaningful burn.
 */
export function computeWeeklyActivitySuggestion(params: {
  sessions: SessionWithBurn[];
  currentActivityLevel: ActivityLevel;
  currentDailyCalories: number;
}): WeeklyActivitySuggestion | null {
  const byDate = buildBurnedCaloriesByDate(params.sessions);
  const last7 = listLast7DateKeys();
  let totalBurned = 0;
  let daysWithWorkouts = 0;

  for (const key of last7) {
    const burned = byDate[key] || 0;
    if (burned > 0) {
      daysWithWorkouts += 1;
      totalBurned += burned;
    }
  }

  // Need at least 3 training days in the last week to suggest anything.
  if (daysWithWorkouts < 3 || totalBurned < 400) {
    return null;
  }

  const avgDailyBurn = Math.round(totalBurned / 7);
  // Suggest adding ~50% of average daily burn to the calorie target (capped).
  const suggestedCalorieBump = Math.min(
    400,
    Math.max(100, Math.round(avgDailyBurn * 0.5))
  );
  const suggestedActivityLevel = nextActivityLevel(params.currentActivityLevel);

  if (
    suggestedCalorieBump <= 0 &&
    !suggestedActivityLevel
  ) {
    return null;
  }

  const activityHint = suggestedActivityLevel
    ? ` o subir actividad a “${ACTIVITY_LABELS[suggestedActivityLevel]}”`
    : "";

  return {
    daysWithWorkouts,
    totalBurnedLast7Days: totalBurned,
    avgDailyBurn,
    suggestedCalorieBump,
    suggestedActivityLevel,
    currentActivityLevel: params.currentActivityLevel,
    message: `En 7 días quemaste ~${totalBurned} kcal en ${daysWithWorkouts} entrenos (media ~${avgDailyBurn}/día). Puedes añadir +${suggestedCalorieBump} kcal a tu objetivo${activityHint}.`,
  };
}

export function activityLevelLabel(level: ActivityLevel): string {
  return ACTIVITY_LABELS[level] ?? level;
}
