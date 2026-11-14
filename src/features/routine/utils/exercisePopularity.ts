import { normalizeSearchText } from "./exerciseSearchText";

const includesAny = (name: string, patterns: string[]): boolean =>
  patterns.some((pattern) => name.includes(pattern));

/** Niche / gimmick variants that should sink below normal gym staples. */
const OBSCURE_PENALTIES: Array<{ patterns: string[]; penalty: number }> = [
  {
    patterns: ["assisted", "asistid", "con asistencia", "machine assisted"],
    penalty: 130,
  },
  {
    patterns: [
      "band ",
      "bands ",
      "banda ",
      "bandas ",
      "resistance band",
      "elastic",
      "elastica",
    ],
    penalty: 110,
  },
  {
    patterns: [
      "bosu",
      "stability ball",
      "fitball",
      "medicine ball",
      "balon medicinal",
    ],
    penalty: 90,
  },
  {
    patterns: ["stretch", "estiramiento", "mobility", "movilidad"],
    penalty: 100,
  },
  {
    patterns: ["smith", "leverage", "palanca"],
    penalty: 70,
  },
  {
    patterns: [
      "finger",
      "wrist",
      "dedo",
      "muneca",
      "neck ",
      "cuello",
      "sissy",
      "pov",
    ],
    penalty: 120,
  },
  {
    patterns: [
      "archer",
      "clapping",
      "plyo",
      "jump ",
      "salto ",
      "explosive",
      "pike ",
      "hindu",
      "diamond ",
    ],
    penalty: 55,
  },
  {
    patterns: [
      "one arm",
      "one-arm",
      "single arm",
      "un brazo",
      "a un brazo",
      "alternating",
      "altern",
      "kneeling",
      "de rodillas",
      "seated on",
      "lying on floor",
    ],
    penalty: 35,
  },
  {
    patterns: ["advanced", "avanzad", "beginner", "principiante"],
    penalty: 25,
  },
];

const computeObscurePenalty = (name: string): number => {
  let penalty = 0;
  for (const rule of OBSCURE_PENALTIES) {
    if (includesAny(name, rule.patterns)) {
      penalty += rule.penalty;
    }
  }
  penalty += Math.min(45, Math.max(0, name.length - 26));
  return penalty;
};

const BASE_TIERS: Array<{ score: number; patterns: string[] }> = [
  {
    score: 300,
    patterns: [
      "press de banca con barra",
      "barbell bench press",
      "bench press",
      "press de banca",
      "sentadilla trasera",
      "barbell full squat",
      "barbell back squat",
      "back squat",
      "peso muerto convencional",
      "barbell deadlift",
      "conventional deadlift",
      "peso muerto",
      "deadlift",
      "dominadas",
      "dominada",
      "pull-up",
      "pull up",
      "chin-up",
      "chin up",
      "press militar",
      "overhead press",
      "military press",
      "shoulder press",
      "remo con barra",
      "barbell row",
      "bent over row",
      "fondos en paralelas",
      "chest dip",
      "triceps dip",
    ],
  },
  {
    score: 220,
    patterns: [
      "sentadilla",
      "squat",
      "prensa de piernas",
      "leg press",
      "jalon al pecho",
      "jalon",
      "lat pulldown",
      "pull-down",
      "pulldown",
      "remo en polea",
      "cable row",
      "seated row",
      "remo sentado",
      "press inclinado",
      "incline bench press",
      "incline press",
      "hip thrust",
      "empuje de cadera",
      "face pull",
      "facepull",
      "elevaciones laterales",
      "elevacion lateral",
      "lateral raise",
      "curl de biceps",
      "bicep curl",
      "curl de biceps con mancuernas",
      "extension de triceps",
      "triceps extension",
      "triceps pushdown",
      "fondos",
      " dips",
      "flexiones",
      "flexion de brazos",
      "push-up",
      "push up",
      "zancada",
      "lunge",
      "peso muerto rumano",
      "romanian deadlift",
      "rdl",
    ],
  },
  {
    score: 140,
    patterns: [
      "press de hombros",
      "press de hombro",
      "dumbbell press",
      "press con mancuernas",
      "aperturas",
      "apertura",
      "chest fly",
      "fly",
      "pajaro",
      "curl martillo",
      "hammer curl",
      "press frances",
      "skull crusher",
      "encogimiento",
      "shrug",
      "gemelo",
      "calf raise",
      "elevacion de gemelos",
      "plancha",
      "plank",
      "crunch",
      "abdominal",
      "remo",
      " row",
      "press",
      "curl",
      "pulldown",
      "prensa",
    ],
  },
  {
    score: 60,
    patterns: [
      "extension",
      "elevacion",
      "raise",
      "puente",
      "bridge",
      "patada",
      "kickback",
      "step-up",
      "step up",
      "good morning",
      "hiperextension",
      "hyperextension",
    ],
  },
];

/**
 * Local heuristic so the list ranks gym staples first even when the cached
 * catalog has popularity=0 / missing (stale offline cache).
 */
export const scoreExercisePopularity = (name: string): number => {
  const n = normalizeSearchText(name);
  if (!n) return 0;

  let base = 0;
  for (const tier of BASE_TIERS) {
    if (includesAny(n, tier.patterns)) {
      base = tier.score;
      break;
    }
  }

  if (base === 0) return 0;
  return Math.max(0, base - computeObscurePenalty(n));
};

/** Prefer API popularity when present; otherwise (or if lower) use name heuristic. */
export const effectiveExercisePopularity = (exercise: {
  name?: string;
  popularity?: number;
}): number => {
  const stored =
    typeof exercise.popularity === "number" &&
    Number.isFinite(exercise.popularity)
      ? exercise.popularity
      : 0;
  const fromName = scoreExercisePopularity(exercise.name || "");
  return Math.max(stored, fromName);
};
