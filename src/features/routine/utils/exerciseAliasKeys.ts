import {
  normalizedKeysMatch,
  toFilterKey,
} from "./exerciseSearchText";

/** Body-part / muscle labels that should resolve to the same filter. */
export const MUSCLE_ALIAS_GROUPS: string[][] = [
  ["pecho", "chest", "pectorales", "pectoral", "pecs", "pectorals"],
  [
    "espalda",
    "back",
    "dorsales",
    "lats",
    "latissimus",
    "espalda alta",
    "espalda baja",
    "upper back",
    "lower back",
  ],
  [
    "hombros",
    "hombro",
    "shoulders",
    "shoulder",
    "deltoides",
    "deltoide",
    "delts",
    "deltoids",
  ],
  ["cintura", "waist", "abdominales", "abs", "core", "abdominal", "abdomen"],
  ["gluteos", "gluteo", "glutes", "glute", "caderas", "hips", "hip"],
  ["pantorrillas", "pantorrilla", "calves", "calf", "gemelo", "gemelos"],
  ["antebrazos", "antebrazo", "forearms", "forearm"],
  ["trapecios", "trapecio", "traps", "trapezius"],
  ["isquiotibiales", "isquiotibial", "hamstrings", "hamstring", "isquio"],
  ["cuadriceps", "cuádriceps", "quadriceps", "quads"],
  ["biceps", "bíceps", "bicep"],
  ["triceps", "tríceps", "tricep"],
  ["cuello", "neck"],
  ["muslos", "thighs", "thigh", "piernas superiores", "upper legs"],
  ["piernas inferiores", "lower legs", "lower leg"],
  ["brazos superiores", "upper arms"],
  ["brazos inferiores", "lower arms", "lower arm"],
  ["aductores", "adductors", "adductor"],
  ["abductores", "abductors", "abductor"],
];

/** Equipment labels that should resolve to the same filter. */
export const EQUIPMENT_ALIAS_GROUPS: string[][] = [
  ["cable", "cables", "polea", "poleas", "cable machine"],
  ["dumbbell", "dumbbells", "mancuerna", "mancuernas"],
  ["barbell", "barra", "barras"],
  [
    "bodyweight",
    "body weight",
    "peso corporal",
    "peso del cuerpo",
    "sin equipo",
  ],
  [
    "machine",
    "maquina",
    "maquinas",
    "leverage machine",
    "maquina de palanca",
  ],
  ["smith", "smith machine", "maquina smith"],
  [
    "band",
    "bands",
    "banda",
    "bandas",
    "banda elastica",
    "banda de resistencia",
    "resistance band",
  ],
  ["kettlebell", "kettlebells", "pesa rusa", "pesas rusas"],
  ["bench", "banco", "bancos"],
  ["ez bar", "ez-bar", "barra z", "ez barbell"],
  ["medicine ball", "balon medicinal", "pelota medicinal"],
  ["stability ball", "pelota de estabilidad", "fitball"],
  ["trx", "suspension", "suspension trainer"],
];

/** Pre-normalized alias groups — avoid re-running toFilterKey on every label scan. */
const NORMALIZED_MUSCLE_ALIAS_GROUPS: string[][] = MUSCLE_ALIAS_GROUPS.map(
  (group) => [...new Set(group.map(toFilterKey).filter(Boolean))]
);

const NORMALIZED_EQUIPMENT_ALIAS_GROUPS: string[][] =
  EQUIPMENT_ALIAS_GROUPS.map((group) => [
    ...new Set(group.map(toFilterKey).filter(Boolean)),
  ]);

const getAliasKeysFromGroups = (
  name: string,
  normalizedGroups: string[][]
): string[] => {
  const key = toFilterKey(name);
  if (!key) return [];

  const aliases = new Set<string>([key]);
  for (const normalizedGroup of normalizedGroups) {
    const belongs = normalizedGroup.some(
      (alias) =>
        normalizedKeysMatch(alias, key) ||
        (alias.length >= 4 && key.includes(alias)) ||
        (key.length >= 4 && alias.includes(key))
    );
    if (belongs) {
      normalizedGroup.forEach((alias) => aliases.add(alias));
    }
  }
  return Array.from(aliases);
};

export const getMuscleAliasKeys = (name: string): string[] =>
  getAliasKeysFromGroups(name, NORMALIZED_MUSCLE_ALIAS_GROUPS);

export const getEquipmentAliasKeys = (name: string): string[] =>
  getAliasKeysFromGroups(name, NORMALIZED_EQUIPMENT_ALIAS_GROUPS);
