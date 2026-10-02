import type { EquipmentDto, MuscleDto } from "@sergiomesasyelamos2000/shared";
import {
  getEquipmentAliasKeys,
  getMuscleAliasKeys,
} from "./exerciseAliasKeys";
import {
  type ExerciseFilterIndex,
  type IndexedSearchFields,
  type SearchableExercise,
  indexedExerciseMatchesEquipment,
  indexedExerciseMatchesMuscle,
  prepareNameFilter,
} from "./exerciseFilterIndex";
import {
  normalizeSearchText,
  normalizedKeysMatch,
  tokenizeSearch,
  toFilterKey,
  valuesMatch,
} from "./exerciseSearchText";

export type { SearchableExercise } from "./exerciseFilterIndex";
export {
  EMPTY_FILTER_NAMES,
  buildExerciseFilterIndex,
  prepareNameFilter,
  rankChipsFromIndex,
  withSelectedChips,
  idsToNames,
  remapFilterSelectionIds,
  DERIVED_MUSCLE_PREFIX,
  DERIVED_EQUIPMENT_PREFIX,
  type ExerciseFilterIndex,
  type ExerciseFilterDraft,
  type RankedFilterChips,
} from "./exerciseFilterIndex";
export {
  getEquipmentAliasKeys,
  getMuscleAliasKeys,
  MUSCLE_ALIAS_GROUPS,
  EQUIPMENT_ALIAS_GROUPS,
} from "./exerciseAliasKeys";
export {
  normalizeSearchText,
  tokenizeSearch,
  toFilterKey,
  valuesMatch,
} from "./exerciseSearchText";

const labelsMatchWithAliases = (
  left: string,
  right: string,
  getAliases: (name: string) => string[]
): boolean => {
  if (valuesMatch(left, right)) return true;
  const leftAliases = getAliases(left);
  const rightAliases = getAliases(right);
  return leftAliases.some((leftAlias) =>
    rightAliases.some((rightAlias) =>
      normalizedKeysMatch(leftAlias, rightAlias)
    )
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
  haystackTokens: readonly string[],
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
 * Rank exercises for free-text search using precomputed fields when available.
 * Multi-word queries require every token to match somewhere (AND).
 */
export const scoreIndexedExerciseSearch = (
  search: IndexedSearchFields,
  normalizedQuery: string,
  queryTokens: string[]
): number => {
  if (!normalizedQuery) return 1;

  const { nameText, nameTokens, extraText, extraTokens, fullText } = search;
  const fullTokens = [...nameTokens, ...extraTokens];

  if (nameText === normalizedQuery) return 200;
  if (nameText.startsWith(normalizedQuery)) return 160;
  if (nameText.includes(normalizedQuery)) return 120;
  if (fullText.includes(normalizedQuery)) return 90;

  if (queryTokens.length === 0) return 0;

  let total = 0;
  for (const queryToken of queryTokens) {
    const nameHit = scoreTokenAgainstHaystack(queryToken, nameTokens, nameText);
    const extraHit = scoreTokenAgainstHaystack(
      queryToken,
      extraTokens,
      extraText
    );
    const best = Math.max(nameHit, Math.floor(extraHit * 0.7));

    if (best === 0) return 0;
    total += best;
  }

  const nameMatchedCount = queryTokens.filter(
    (token) => scoreTokenAgainstHaystack(token, nameTokens, nameText) > 0
  ).length;
  total += nameMatchedCount * 8;

  if (nameMatchedCount === queryTokens.length) {
    total += 15;
  }

  if (total > 0 && fullTokens.length === 0) return 0;

  return total;
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

  return scoreIndexedExerciseSearch(
    {
      nameText,
      nameTokens,
      extraText,
      extraTokens,
      fullText: `${nameText} ${extraText}`.trim(),
    },
    normalizedQuery,
    queryTokens
  );
};

export const filterAndSortExercises = <T extends SearchableExercise>(
  exercises: T[],
  options: {
    searchQuery: string;
    selectedEquipmentNames: readonly string[];
    selectedMuscleNames: readonly string[];
    index?: ExerciseFilterIndex<T>;
  }
): T[] => {
  const normalizedQuery = normalizeSearchText(options.searchQuery);
  const queryTokens = tokenizeSearch(options.searchQuery);

  if (options.index && options.index.entries.length === exercises.length) {
    const preparedEquipment = prepareNameFilter(
      options.selectedEquipmentNames,
      getEquipmentAliasKeys
    );
    const preparedMuscle = prepareNameFilter(
      options.selectedMuscleNames,
      getMuscleAliasKeys
    );

    const scored = options.index.entries
      .map((entry) => {
        const searchScore = scoreIndexedExerciseSearch(
          entry.search,
          normalizedQuery,
          queryTokens
        );
        const matchesEquipment = indexedExerciseMatchesEquipment(
          entry,
          preparedEquipment
        );
        const matchesMuscle = indexedExerciseMatchesMuscle(
          entry,
          preparedMuscle
        );

        return {
          exercise: entry.exercise,
          searchScore,
          originalIndex: entry.originalIndex,
          visible: searchScore > 0 && matchesEquipment && matchesMuscle,
        };
      })
      .filter((item) => item.visible);

    if (normalizedQuery) {
      scored.sort((a, b) => {
        if (b.searchScore !== a.searchScore) {
          return b.searchScore - a.searchScore;
        }
        return a.originalIndex - b.originalIndex;
      });
    }

    return scored.map((item) => item.exercise);
  }

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

  if (normalizedQuery) {
    scored.sort((a, b) => {
      if (b.searchScore !== a.searchScore) {
        return b.searchScore - a.searchScore;
      }
      return a.originalIndex - b.originalIndex;
    });
  }

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
    total += usageByName.get(toFilterKey(name)) || 0;
    return total;
  };

  const withScore = options.map((option) => ({
    option,
    score: resolveUsage(option.name),
  }));

  const selectedSet = new Set(selectedIds);
  const topOptions = withScore
    .sort(
      (a, b) =>
        b.score - a.score || a.option.name.localeCompare(b.option.name)
    )
    .slice(0, maxOptions)
    .map((entry) => entry.option);

  const selectedOutsideTop = options.filter(
    (option) =>
      selectedSet.has(option.id) &&
      !topOptions.some((top) => top.id === option.id)
  );

  return [...topOptions, ...selectedOutsideTop];
};
