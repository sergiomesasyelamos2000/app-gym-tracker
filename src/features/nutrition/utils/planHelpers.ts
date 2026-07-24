import type {
  MealType,
  NutritionPlanResponseDto as NutritionPlan,
  NutritionPlanStatus,
} from "@sergiomesasyelamos2000/shared";

export const MEAL_TYPE_CONFIG: Record<
  MealType,
  { icon: string; label: string; color: string }
> = {
  breakfast: { icon: "cafe-outline", label: "Desayuno", color: "#FF9800" },
  lunch: { icon: "restaurant-outline", label: "Almuerzo", color: "#4CAF50" },
  dinner: { icon: "moon-outline", label: "Cena", color: "#673AB7" },
  snack: { icon: "pizza-outline", label: "Snack", color: "#2196F3" },
};

export const PLAN_STATUS_LABELS: Record<NutritionPlanStatus, string> = {
  draft: "Borrador",
  active: "Activo",
  archived: "Archivado",
};

export function formatPlanDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function getPlanStatusColor(
  status: NutritionPlanStatus,
  theme: { success: string; warning: string; textSecondary: string }
): string {
  if (status === "active") return theme.success;
  if (status === "draft") return theme.warning;
  return theme.textSecondary;
}

export function sortPlansByRecent(plans: NutritionPlan[]): NutritionPlan[] {
  return [...plans].sort((a, b) => {
    const aTime = new Date(a.updatedAt).getTime();
    const bTime = new Date(b.updatedAt).getTime();
    return bTime - aTime;
  });
}
