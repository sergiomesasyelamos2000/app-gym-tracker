export const NUTRITION_AGENT_NAME = "Ava";

export const NUTRITION_CHAT_TITLE = NUTRITION_AGENT_NAME;

export const LOW_QUERY_THRESHOLD = 3;

export const NUTRITION_CHAT_ROLE = "Asistente de nutrición";

export const NUTRITION_CHAT_WELCOME =
  "¡Hola! Soy Ava, tu asistente de nutrición. ¿Cómo puedo ayudarte hoy?";

export const NUTRITION_CHAT_EMPTY_LINE =
  "Pregunta a Ava por dieta, macros o una foto.";

export const NUTRITION_CHAT_CHIPS = [
  {
    id: "diet-plan",
    label: "Plan de dieta",
    prompt: "Créame un plan de dieta personalizado",
  },
  {
    id: "macros",
    label: "Calcular macros",
    prompt: "Ayúdame a calcular mis macros",
  },
  {
    id: "analyze-food",
    label: "Analizar comida",
    prompt: null,
  },
] as const;

export const ADD_FOOD_MODAL_COPY = {
  title: "Añadir al diario",
  mealLabel: "Comida",
  gramsLabel: "Cantidad (gramos)",
  gramsPlaceholder: "Ej: 180",
  save: "Guardar",
  cancel: "Cancelar",
  meals: [
    { key: "breakfast" as const, label: "Desayuno" },
    { key: "lunch" as const, label: "Comida" },
    { key: "dinner" as const, label: "Cena" },
    { key: "snack" as const, label: "Snack" },
  ],
};

export type NutritionQuotaTone = "ok" | "low" | "exhausted";

export type NutritionQuotaBadge = {
  label: string;
  tone: NutritionQuotaTone;
};

export function nutritionChatRoleLine(): string {
  return NUTRITION_CHAT_ROLE;
}

/** @deprecated Prefer nutritionChatQuotaBadge for free-tier UI */
export function nutritionChatSubtitle(
  remainingCalls: number | null,
  dailyLimit: number
): string | undefined {
  const badge = nutritionChatQuotaBadge(remainingCalls, dailyLimit);
  return badge?.label;
}

export function nutritionChatQuotaBadge(
  remainingCalls: number | null,
  _dailyLimit: number
): NutritionQuotaBadge | null {
  if (remainingCalls === null) return null;
  if (remainingCalls <= 0) {
    return { label: "Sin consultas gratis", tone: "exhausted" };
  }
  const label =
    remainingCalls === 1
      ? "1 consulta gratis"
      : `${remainingCalls} consultas gratis`;
  const tone: NutritionQuotaTone =
    remainingCalls <= LOW_QUERY_THRESHOLD ? "low" : "ok";
  return { label, tone };
}
