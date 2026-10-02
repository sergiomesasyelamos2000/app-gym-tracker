export const NUTRITION_CHAT_TITLE = "Nutrición IA";

export const LOW_QUERY_THRESHOLD = 3;

export const NUTRITION_CHAT_EMPTY_LINE =
  "Pregunta por dieta, macros o una foto.";

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

export function nutritionChatSubtitle(
  remainingCalls: number | null,
  dailyLimit: number
): string | undefined {
  if (remainingCalls === null) return undefined;
  if (remainingCalls <= 0) return "Límite alcanzado";
  return `${remainingCalls} de ${dailyLimit} consultas`;
}
