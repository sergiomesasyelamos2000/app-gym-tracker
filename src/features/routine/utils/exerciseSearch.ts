import type { EquipmentDto, MuscleDto } from "@sergiomesasyelamos2000/shared";

export type SearchableExercise = {
  id: string;
  name: string;
  equipments?: string[];
  targetMuscles?: string[];
  secondaryMuscles?: string[];
  bodyParts?: string[];
  keywords?: string[];
  muscularGroup?: string;
};

const SEARCH_STOP_WORDS = new Set([
  "de",
  "del",
  "la",
  "el",
  "los",
  "las",
  "con",
  "y",
  "en",
  "para",
  "a",
  "al",
  "un",
  "una",
  "unos",
  "unas",
]);

/** Body-part / muscle labels that should resolve to the same filter. */
export const MUSCLE_ALIAS_GROUPS: string[][] = [
  ["pecho", "chest", "pectorales", "pectoral", "pecs", "pectorals"],
  ["espalda", "back", "dorsales", "lats", "latissimus", "espalda alta", "espalda baja", "upper back", "lower back"],
  ["hombros", "hombro", "shoulders", "shoulder", "deltoides", "deltoide", "delts", "deltoids"],
  ["cintura", "waist", "abdominales", "abs", "core", "abdominal", "abdomen"],
  ["gluteos", "gluteo", "glutes", "glute", "caderas", "hips", "hip"],
  ["pantorrillas", "pantorrilla", "calves", "calf", "gemelo", "gemelos"],
  ["antebrazos", "antebrazo", "forearms", "forearm"],
  ["trapecios", "trapecio", "traps", "trapezius"],
  ["isquiotibiales", "isquiotibial", "hamstrings", "hamstring", "isquio"],
  [
    "cuadriceps",
    "cuádriceps",
    "quadriceps",
    "quads",
  ],
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

export const normalizeSearchText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const tokenizeSearch = (value: string) =>
  normalizeSearchText(value)
    .split(" ")
    .filter((token) => token.length > 0 && !SEARCH_STOP_WORDS.has(token));

export const toFilterKey = (value: string) => normalizeSearchText(value);

/**
 * Flexible label match: equality, prefix, or substring (min length 3).
 */
export const valuesMatch = (value: string, expected: string): boolean => {
  const normalizedValue = normalizeSearchText(value);
  const normalizedExpected = normalizeSearchText(expected);
  if (!normalizedValue || !normalizedExpected) return false;

  if (
    normalizedValue === normalizedExpected ||
    normalizedValue.startsWith(`${normalizedExpected} `) ||
    normalizedExpected.startsWith(`${normalizedValue} `) ||
    normalizedValue.startsWith(normalizedExpected) ||
    normalizedExpected.startsWith(normalizedValue)
  ) {
    return true;
  }

  if (normalizedExpected.length >= 3 && normalizedValue.includes(normalizedExpected)) {
    return true;
  }
  if (normalizedValue.length >= 3 && normalizedExpected.includes(normalizedValue)) {
    return true;
  }

  return false;
};

const getAliasKeysFromGroups = (
  name: string,
  groups: string[][]
): string[] => {
  const key = toFilterKey(name);
  if (!key) return [];

  const aliases = new Set<string>([key]);
  for (const group of groups) {
    const normalizedGroup = group.map(toFilterKey).filter(Boolean);
    const belongs = normalizedGroup.some(
      (alias) =>
        valuesMatch(alias, key) ||
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
  getAliasKeysFromGroups(name, MUSCLE_ALIAS_GROUPS);

export const getEquipmentAliasKeys = (name: string): string[] =>
  getAliasKeysFromGroups(name, EQUIPMENT_ALIAS_GROUPS);

const labelsMatchWithAliases = (
  left: string,
  right: string,
  getAliases: (name: string) => string[]
): boolean => {
  if (valuesMatch(left, right)) return true;
  const leftAliases = getAliases(left);
  const rightAliases = getAliases(right);
  return leftAliases.some((leftAlias) =>
    rightAliases.some((rightAlias) => valuesMatch(leftAlias, rightAlias))
  );
};

export const exerciseMatchesMuscle = (
  exercise: SearchableExercise,
  selectedName: string
): boolean => {
  const exerciseMuscles = [
    ...(exercise.targetMuscles || []),
    ...(exercise.secondaryMuscles || []),
    ...(exercise.bodyParts || []),
    ...(exercise.muscularGroup ? [exercise.muscularGroup] : []),
  ];
  if (exerciseMuscles.length === 0) return false;

  return exerciseMuscles.some((value) =>
    labelsMatchWithAliases(value, selectedName, getMuscleAliasKeys)
  );
};

export const exerciseMatchesEquipment = (
  exercise: SearchableExercise,
  selectedName: string
): boolean => {
  const equipments = exercise.equipments || [];
  if (equipments.length === 0) return false;

  return equipments.some((value) =>
    labelsMatchWithAliases(value, selectedName, getEquipmentAliasKeys)
  );
};

const scoreTokenAgainstHaystack = (
  queryToken: string,
  haystackTokens: string[],
  haystackText: string
): number => {
  let best = 0;

  for (const token of haystackTokens) {
    if (token === queryToken) best = Math.max(best, 30);
    else if (token.startsWith(queryToken)) best = Math.max(best, 22);
    else if (queryToken.length >= 3 && token.includes(queryToken)) {
      best = Math.max(best, 14);
    } else if (token.length >= 3 && queryToken.includes(token)) {
      best = Math.max(best, 10);
    }
  }

  if (best === 0 && queryToken.length >= 3 && haystackText.includes(queryToken)) {
    best = 12;
  }

  return best;
};

/**
 * Rank exercises for free-text search.
 * Multi-word queries require every token to match somewhere (AND).
 */
export const scoreExerciseSearch = (
  exercise: SearchableExercise,
  normalizedQuery: string,
  queryTokens: string[]
): number => {
  if (!normalizedQuery) return 1;

  const nameText = normalizeSearchText(exercise.name);
  const nameTokens = tokenizeSearch(exercise.name);

  const extraFields = [
    ...(exercise.equipments || []),
    ...(exercise.targetMuscles || []),
    ...(exercise.secondaryMuscles || []),
    ...(exercise.bodyParts || []),
    ...(exercise.keywords || []),
    ...(exercise.muscularGroup ? [exercise.muscularGroup] : []),
  ];
  const extraText = normalizeSearchText(extraFields.join(" "));
  const extraTokens = tokenizeSearch(extraFields.join(" "));
  const fullText = `${nameText} ${extraText}`.trim();
  const fullTokens = [...nameTokens, ...extraTokens];

  if (nameText === normalizedQuery) return 200;
  if (nameText.startsWith(normalizedQuery)) return 160;
  if (nameText.includes(normalizedQuery)) return 120;
  if (fullText.includes(normalizedQuery)) return 90;

  if (queryTokens.length === 0) return 0;

  let total = 0;
  for (const queryToken of queryTokens) {
    const nameHit = scoreTokenAgainstHaystack(queryToken, nameTokens, nameText);
    const extraHit = scoreTokenAgainstHaystack(queryToken, extraTokens, extraText);
    const best = Math.max(nameHit, Math.floor(extraHit * 0.7));

    // Every query token must match somewhere.
    if (best === 0) return 0;
    total += best;
  }

  // Prefer matches concentrated in the name.
  const nameMatchedCount = queryTokens.filter(
    (token) => scoreTokenAgainstHaystack(token, nameTokens, nameText) > 0
  ).length;
  total += nameMatchedCount * 8;

  // Slight boost when all tokens appear as contiguous-ish name coverage.
  if (nameMatchedCount === queryTokens.length) {
    total += 15;
  }

  // Avoid scoring noise from extremely loose full-token overlap alone.
  if (total > 0 && fullTokens.length === 0) return 0;

  return total;
};

export const filterAndSortExercises = <T extends SearchableExercise>(
  exercises: T[],
  options: {
    searchQuery: string;
    selectedEquipmentNames: string[];
    selectedMuscleNames: string[];
  }
): T[] => {
  const normalizedQuery = normalizeSearchText(options.searchQuery);
  const queryTokens = tokenizeSearch(options.searchQuery);

  const scored = exercises
    .map((exercise, originalIndex) => {
      const searchScore = scoreExerciseSearch(
        exercise,
        normalizedQuery,
        queryTokens
      );

      const matchesEquipment =
        options.selectedEquipmentNames.length === 0 ||
        options.selectedEquipmentNames.some((selected) =>
          exerciseMatchesEquipment(exercise, selected)
        );

      const matchesMuscle =
        options.selectedMuscleNames.length === 0 ||
        options.selectedMuscleNames.some((selected) =>
          exerciseMatchesMuscle(exercise, selected)
        );

      return {
        exercise,
        searchScore,
        originalIndex,
        visible: searchScore > 0 && matchesEquipment && matchesMuscle,
      };
    })
    .filter((item) => item.visible);

  scored.sort((a, b) => {
    if (!normalizedQuery) {
      return a.originalIndex - b.originalIndex;
    }
    if (b.searchScore !== a.searchScore) {
      return b.searchScore - a.searchScore;
    }
    return a.originalIndex - b.originalIndex;
  });

  return scored.map((item) => item.exercise);
};

const canonicalAliasKey = (
  name: string,
  getAliases: (name: string) => string[]
): string => {
  const aliases = getAliases(name).sort((a, b) => a.localeCompare(b));
  return aliases[0] || toFilterKey(name);
};

/**
 * Merge catalog + derived labels, collapsing alias duplicates.
 * Prefers official options over derived ones.
 */
export const mergeFilterOptionsByAlias = <T extends { id: string; name: string }>(
  official: T[],
  derivedNames: string[],
  getAliases: (name: string) => string[],
  derivedIdPrefix: string
): T[] => {
  const byCanonical = new Map<string, T>();

  official.forEach((item) => {
    const key = canonicalAliasKey(item.name, getAliases);
    if (!key) return;
    if (!byCanonical.has(key)) {
      byCanonical.set(key, item);
    }
  });

  derivedNames.forEach((name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const key = canonicalAliasKey(trimmed, getAliases);
    if (!key || byCanonical.has(key)) return;

    byCanonical.set(key, {
      id: `${derivedIdPrefix}${key}`,
      name: trimmed,
    } as T);
  });

  return Array.from(byCanonical.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "es", { sensitivity: "base" })
  );
};

export const buildCombinedMuscleOptions = (
  muscleOptions: MuscleDto[],
  exercises: SearchableExercise[]
): MuscleDto[] => {
  const derivedNames: string[] = [];
  exercises.forEach((exercise) => {
    derivedNames.push(
      ...(exercise.targetMuscles || []),
      ...(exercise.secondaryMuscles || []),
      ...(exercise.bodyParts || [])
    );
  });

  return mergeFilterOptionsByAlias(
    muscleOptions,
    derivedNames,
    getMuscleAliasKeys,
    "derived-muscle-"
  );
};

export const buildCombinedEquipmentOptions = (
  equipmentOptions: EquipmentDto[],
  exercises: SearchableExercise[]
): EquipmentDto[] => {
  const derivedNames: string[] = [];
  exercises.forEach((exercise) => {
    derivedNames.push(...(exercise.equipments || []));
  });

  return mergeFilterOptionsByAlias(
    equipmentOptions,
    derivedNames,
    getEquipmentAliasKeys,
    "derived-equipment-"
  );
};

export const rankFilterOptionsByUsage = <T extends { id: string; name: string }>(
  options: T[],
  usageByName: Map<string, number>,
  selectedIds: string[],
  maxOptions: number,
  getAliases: (name: string) => string[]
): T[] => {
  if (options.length <= maxOptions) return options;

  const resolveUsage = (name: string): number => {
    const aliases = getAliases(name);
    let total = 0;
    aliases.forEach((alias) => {
      total += usageByName.get(alias) || 0;
    });
    // Also count exact key if aliases missed raw labels.
    total += usageByName.get(toFilterKey(name)) || 0;
    return total;
  };

  const withScore = options.map((option) => ({
    option,
    score: resolveUsage(option.name),
  }));

  const selectedSet = new Set(selectedIds);
  const topOptions = withScore
    .sort((a, b) => b.score - a.score || a.option.name.localeCompare(b.option.name))
    .slice(0, maxOptions)
    .map((entry) => entry.option);

  const selectedOutsideTop = options.filter(
    (option) =>
      selectedSet.has(option.id) &&
      !topOptions.some((top) => top.id === option.id)
  );

  return [...topOptions, ...selectedOutsideTop];
};
