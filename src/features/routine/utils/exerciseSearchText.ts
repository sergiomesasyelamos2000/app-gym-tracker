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
 * Match two already-normalized filter keys (no second NFD pass).
 */
export const normalizedKeysMatch = (left: string, right: string): boolean => {
  if (!left || !right) return false;
  if (
    left === right ||
    left.startsWith(`${right} `) ||
    right.startsWith(`${left} `) ||
    left.startsWith(right) ||
    right.startsWith(left)
  ) {
    return true;
  }
  if (right.length >= 3 && left.includes(right)) return true;
  if (left.length >= 3 && right.includes(left)) return true;
  return false;
};

/**
 * Flexible label match: equality, prefix, or substring (min length 3).
 */
export const valuesMatch = (value: string, expected: string): boolean => {
  const normalizedValue = normalizeSearchText(value);
  const normalizedExpected = normalizeSearchText(expected);
  return normalizedKeysMatch(normalizedValue, normalizedExpected);
};
