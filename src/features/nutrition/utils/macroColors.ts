/**
 * Canonical macro colors used across search list, diary chips and charts.
 *
 * Global convention (MyFitnessPal / most nutrition apps):
 * - Protein  → red
 * - Carbs    → blue
 * - Fat      → yellow / gold
 * - Calories → green
 *
 * Display order (always): calories → protein → carbs → fat
 */
export const MACRO_COLORS = {
  protein: {
    accent: "#E53935",
    background: "#FFEBEE",
    text: "#C62828",
  },
  carbs: {
    accent: "#1E88E5",
    background: "#E3F2FD",
    text: "#1565C0",
  },
  fat: {
    accent: "#F9A825",
    background: "#FFF8E1",
    text: "#F57F17",
  },
  calories: {
    accent: "#10B981",
    background: "#ECFDF5",
    text: "#047857",
  },
} as const;

export type MacroColorKey = keyof typeof MACRO_COLORS;

/** Grams macros in canonical UI order: P → C → G */
export const MACRO_GRAMS_ORDER = ["protein", "carbs", "fat"] as const;

export type MacroGramsKey = (typeof MACRO_GRAMS_ORDER)[number];

export const MACRO_LABELS: Record<
  MacroGramsKey | "calories",
  { short: string; long: string }
> = {
  calories: { short: "kcal", long: "Calorías" },
  protein: { short: "P", long: "Proteína" },
  carbs: { short: "C", long: "Carbohidratos" },
  fat: { short: "G", long: "Grasa" },
};

/** Chip label on light pastel backgrounds (Macros diary). */
export const MACRO_CHIP_TEXT_ON_PASTEL = "#1A1A1A";

export function getMacroPillColors(
  macro: MacroColorKey,
  isDark: boolean
): { background: string; text: string; accent: string } {
  const palette = MACRO_COLORS[macro];
  if (!isDark) {
    return {
      background: palette.background,
      text: palette.text,
      accent: palette.accent,
    };
  }

  return {
    background: `${palette.accent}22`,
    text: palette.accent,
    accent: palette.accent,
  };
}
