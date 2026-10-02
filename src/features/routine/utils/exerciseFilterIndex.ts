import {
  getEquipmentAliasKeys,
  getMuscleAliasKeys,
} from "./exerciseAliasKeys";
import {
  normalizeSearchText,
  normalizedKeysMatch,
  tokenizeSearch,
  toFilterKey,
} from "./exerciseSearchText";

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

/** Stable empty selection — avoids invalidating filtered list memos. */
export const EMPTY_FILTER_NAMES: readonly string[] = Object.freeze([]);

export type IndexedSearchFields = {
  nameText: string;
  nameTokens: readonly string[];
  extraText: string;
  extraTokens: readonly string[];
  fullText: string;
};

export type IndexedExercise<T extends SearchableExercise> = {
  exercise: T;
  originalIndex: number;
  muscleAliasKeys: ReadonlySet<string>;
  equipmentAliasKeys: ReadonlySet<string>;
  normalizedMuscleLabels: readonly string[];
  normalizedEquipmentLabels: readonly string[];
  search: IndexedSearchFields;
};

export type ExerciseFilterIndex<
  T extends SearchableExercise = SearchableExercise,
> = {
  revision: number;
  entries: readonly IndexedExercise<T>[];
  usageByEquipment: ReadonlyMap<string, number>;
  usageByMuscle: ReadonlyMap<string, number>;
  derivedEquipmentNames: readonly string[];
  derivedMuscleNames: readonly string[];
};

export type PreparedNameFilter = {
  /** Empty means this dimension is unconstrained. */
  aliasKeys: readonly string[];
};

export type RankedFilterChips<T extends { id: string; name: string }> = {
  top: readonly T[];
  all: readonly T[];
};

export type ExerciseFilterDraft = {
  equipmentIds: readonly string[];
  muscleIds: readonly string[];
};

const bumpUsage = (
  map: Map<string, number>,
  keys: Iterable<string>
): void => {
  for (const key of keys) {
    if (!key) continue;
    map.set(key, (map.get(key) || 0) + 1);
  }
};

const collectMuscleLabels = (exercise: SearchableExercise): string[] => [
  ...(exercise.targetMuscles || []),
  ...(exercise.secondaryMuscles || []),
  ...(exercise.bodyParts || []),
  ...(exercise.muscularGroup ? [exercise.muscularGroup] : []),
];

export const buildIndexedSearchFields = (
  exercise: SearchableExercise
): IndexedSearchFields => {
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
  const extraJoined = extraFields.join(" ");
  const extraText = normalizeSearchText(extraJoined);
  const extraTokens = tokenizeSearch(extraJoined);
  const fullText = `${nameText} ${extraText}`.trim();

  return {
    nameText,
    nameTokens,
    extraText,
    extraTokens,
    fullText,
  };
};

/**
 * One catalog pass: alias sets, usage maps, derived names, cached search fields.
 * Usage increments per source label (not per deduped set) to preserve chip order.
 */
export const buildExerciseFilterIndex = <T extends SearchableExercise>(
  exercises: readonly T[],
  revision: number
): ExerciseFilterIndex<T> => {
  const usageByEquipment = new Map<string, number>();
  const usageByMuscle = new Map<string, number>();
  const derivedEquipmentNames: string[] = [];
  const derivedMuscleNames: string[] = [];
  const entries: IndexedExercise<T>[] = [];

  exercises.forEach((exercise, originalIndex) => {
    const muscleAliasKeys = new Set<string>();
    const equipmentAliasKeys = new Set<string>();
    const normalizedMuscleLabels: string[] = [];
    const normalizedEquipmentLabels: string[] = [];

    const muscleLabels = collectMuscleLabels(exercise);
    muscleLabels.forEach((label) => {
      const trimmed = label?.trim();
      if (!trimmed) return;
      derivedMuscleNames.push(trimmed);
      const aliases = getMuscleAliasKeys(trimmed);
      aliases.forEach((key) => muscleAliasKeys.add(key));
      bumpUsage(usageByMuscle, aliases);
      const rawKey = toFilterKey(trimmed);
      if (rawKey) {
        bumpUsage(usageByMuscle, [rawKey]);
        normalizedMuscleLabels.push(rawKey);
      }
    });

    (exercise.equipments || []).forEach((label) => {
      const trimmed = label?.trim();
      if (!trimmed) return;
      derivedEquipmentNames.push(trimmed);
      const aliases = getEquipmentAliasKeys(trimmed);
      aliases.forEach((key) => equipmentAliasKeys.add(key));
      bumpUsage(usageByEquipment, aliases);
      const rawKey = toFilterKey(trimmed);
      if (rawKey) {
        bumpUsage(usageByEquipment, [rawKey]);
        normalizedEquipmentLabels.push(rawKey);
      }
    });

    entries.push({
      exercise,
      originalIndex,
      muscleAliasKeys,
      equipmentAliasKeys,
      normalizedMuscleLabels,
      normalizedEquipmentLabels,
      search: buildIndexedSearchFields(exercise),
    });
  });

  return {
    revision,
    entries,
    usageByEquipment,
    usageByMuscle,
    derivedEquipmentNames,
    derivedMuscleNames,
  };
};

export const prepareNameFilter = (
  names: readonly string[],
  getAliases: (name: string) => string[]
): PreparedNameFilter => {
  if (names.length === 0) return { aliasKeys: EMPTY_FILTER_NAMES };

  const keys = new Set<string>();
  names.forEach((name) => {
    getAliases(name).forEach((key) => keys.add(key));
    const raw = toFilterKey(name);
    if (raw) keys.add(raw);
  });

  return { aliasKeys: Array.from(keys) };
};

const entryMatchesPreparedFilter = (
  prepared: PreparedNameFilter,
  aliasKeys: ReadonlySet<string>,
  normalizedLabels: readonly string[]
): boolean => {
  if (prepared.aliasKeys.length === 0) return true;

  return prepared.aliasKeys.some((selectedKey) => {
    if (aliasKeys.has(selectedKey)) return true;

    if (
      normalizedLabels.some((label) =>
        normalizedKeysMatch(label, selectedKey)
      )
    ) {
      return true;
    }

    for (const exerciseKey of aliasKeys) {
      if (normalizedKeysMatch(exerciseKey, selectedKey)) return true;
    }
    return false;
  });
};

export const indexedExerciseMatchesMuscle = <T extends SearchableExercise>(
  entry: IndexedExercise<T>,
  prepared: PreparedNameFilter
): boolean => {
  if (prepared.aliasKeys.length === 0) return true;
  if (
    entry.normalizedMuscleLabels.length === 0 &&
    entry.muscleAliasKeys.size === 0
  ) {
    return false;
  }
  return entryMatchesPreparedFilter(
    prepared,
    entry.muscleAliasKeys,
    entry.normalizedMuscleLabels
  );
};

export const indexedExerciseMatchesEquipment = <T extends SearchableExercise>(
  entry: IndexedExercise<T>,
  prepared: PreparedNameFilter
): boolean => {
  if (prepared.aliasKeys.length === 0) return true;
  if (
    entry.normalizedEquipmentLabels.length === 0 &&
    entry.equipmentAliasKeys.size === 0
  ) {
    return false;
  }
  return entryMatchesPreparedFilter(
    prepared,
    entry.equipmentAliasKeys,
    entry.normalizedEquipmentLabels
  );
};

const resolveUsage = (
  name: string,
  usageByName: ReadonlyMap<string, number>,
  getAliases: (name: string) => string[]
): number => {
  const aliases = getAliases(name);
  let total = 0;
  aliases.forEach((alias) => {
    total += usageByName.get(alias) || 0;
  });
  total += usageByName.get(toFilterKey(name)) || 0;
  return total;
};

/**
 * Rank options by usage. Selection is NOT a dep —
 * use withSelectedChips to append selected-outside-top without resorting.
 */
export const rankChipsFromIndex = <T extends { id: string; name: string }>(
  options: readonly T[],
  usageByName: ReadonlyMap<string, number>,
  maxOptions: number,
  getAliases: (name: string) => string[]
): RankedFilterChips<T> => {
  const all = options as T[];
  if (all.length <= maxOptions) {
    return { top: all, all };
  }

  const withScore = all.map((option) => ({
    option,
    score: resolveUsage(option.name, usageByName, getAliases),
  }));

  const top = withScore
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.option.name.localeCompare(b.option.name, "es", {
          sensitivity: "base",
        })
    )
    .slice(0, maxOptions)
    .map((entry) => entry.option);

  return { top, all };
};

export const withSelectedChips = <T extends { id: string }>(
  ranked: RankedFilterChips<T>,
  selectedIds: readonly string[]
): readonly T[] => {
  if (selectedIds.length === 0) return ranked.top;

  const topIds = new Set(ranked.top.map((item) => item.id));
  const selectedSet = new Set(selectedIds);
  const selectedOutsideTop = ranked.all.filter(
    (option) => selectedSet.has(option.id) && !topIds.has(option.id)
  );

  if (selectedOutsideTop.length === 0) return ranked.top;
  return [...ranked.top, ...selectedOutsideTop];
};

export const idsToNames = <T extends { id: string; name: string }>(
  byId: ReadonlyMap<string, T>,
  ids: readonly string[]
): readonly string[] => {
  if (ids.length === 0) return EMPTY_FILTER_NAMES;
  const names: string[] = [];
  ids.forEach((id) => {
    const item = byId.get(id);
    if (item?.name) names.push(item.name);
  });
  return names.length === 0 ? EMPTY_FILTER_NAMES : names;
};

const DERIVED_MUSCLE_PREFIX = "derived-muscle-";
const DERIVED_EQUIPMENT_PREFIX = "derived-equipment-";

/**
 * When official options replace derived chips, map selected derived-* ids
 * to the official id sharing the same canonical alias key.
 */
export const remapFilterSelectionIds = <T extends { id: string; name: string }>(
  selectedIds: readonly string[],
  options: readonly T[],
  getAliases: (name: string) => string[],
  derivedPrefix: string
): string[] => {
  if (selectedIds.length === 0) return [];

  const byId = new Map(options.map((item) => [item.id, item]));
  const byCanonical = new Map<string, string>();

  options.forEach((item) => {
    const aliases = getAliases(item.name).sort((a, b) => a.localeCompare(b));
    const key = aliases[0] || toFilterKey(item.name);
    if (key && !byCanonical.has(key)) {
      byCanonical.set(key, item.id);
    }
  });

  const resolved: string[] = [];
  selectedIds.forEach((id) => {
    if (byId.has(id)) {
      if (!resolved.includes(id)) resolved.push(id);
      return;
    }

    if (id.startsWith(derivedPrefix)) {
      const derivedKey = id.slice(derivedPrefix.length);
      const officialId = byCanonical.get(derivedKey);
      if (officialId && !resolved.includes(officialId)) {
        resolved.push(officialId);
      }
      return;
    }

    // Unknown id — drop once options are available.
  });

  return resolved;
};

export { DERIVED_MUSCLE_PREFIX, DERIVED_EQUIPMENT_PREFIX };
