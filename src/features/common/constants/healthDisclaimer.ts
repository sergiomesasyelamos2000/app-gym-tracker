export type HealthSourceId =
  | "mifflin"
  | "who-weight"
  | "who-diet"
  | "niddk-weight";

export type HealthSource = {
  id: HealthSourceId;
  label: string;
  citation: string;
  url: string;
};

export const HEALTH_DISCLAIMER = {
  title: "Aviso importante",
  summary:
    "EvoFit no es una app médica. Las recomendaciones son orientativas y no sustituyen el consejo de un profesional de la salud.",
  consultProfessional:
    "Consulta siempre a un médico o nutricionista antes de cambiar tu dieta o rutina de ejercicio.",
  aiEstimate:
    "Estimación orientativa generada por IA.",
};

export const HEALTH_SOURCES: HealthSource[] = [
  {
    id: "mifflin",
    label: "Cálculo calórico (Mifflin-St Jeor)",
    citation: "Mifflin MD et al. (1990)",
    url: "https://pubmed.ncbi.nlm.nih.gov/2305711/",
  },
  {
    id: "who-weight",
    label: "Ritmo de pérdida de peso",
    citation: "OMS — Obesidad y sobrepeso",
    url: "https://www.who.int/es/news-room/fact-sheets/detail/obesity-and-overweight",
  },
  {
    id: "who-diet",
    label: "Recomendaciones dietéticas generales",
    citation: "OMS — Dieta saludable",
    url: "https://www.who.int/es/news-room/fact-sheets/detail/healthy-diet",
  },
  {
    id: "niddk-weight",
    label: "Ganancia de peso saludable",
    citation: "NIH NIDDK — Control de peso en adultos",
    url: "https://www.niddk.nih.gov/health-information/weight-management/adult-overweight-obesity",
  },
];

export function getHealthSourceById(id: HealthSourceId): HealthSource {
  const source = HEALTH_SOURCES.find((item) => item.id === id);
  if (!source) {
    throw new Error(`Unknown health source: ${id}`);
  }
  return source;
}

export function getInlineHealthSourceIds(
  weightGoal: "lose" | "gain" | "maintain"
): HealthSourceId[] {
  if (weightGoal === "lose") {
    return ["who-weight", "mifflin"];
  }
  if (weightGoal === "gain") {
    return ["niddk-weight", "mifflin"];
  }
  return ["who-diet", "mifflin"];
}
