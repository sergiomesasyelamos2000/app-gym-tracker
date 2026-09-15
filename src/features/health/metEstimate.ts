/**
 * Estimate active calories for resistance training using MET.
 * Default MET ~6.0 (weight training, vigorous) — Compendium of Physical Activities.
 *
 * kcal = MET * weightKg * hours
 */
export function estimateCaloriesFromMet(params: {
  weightKg: number;
  durationSeconds: number;
  met?: number;
}): number {
  const weightKg = Math.max(0, params.weightKg || 0);
  const hours = Math.max(0, params.durationSeconds) / 3600;
  const met = params.met ?? 6;
  if (!weightKg || !hours) return 0;
  return Math.round(met * weightKg * hours);
}
