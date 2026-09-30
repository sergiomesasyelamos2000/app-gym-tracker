/**
 * Sanitize free-text numeric input for nutrition forms.
 * Accepts "." and "," as decimal separators; keeps a single fractional part.
 */
export function sanitizeDecimalInput(value: string): string {
  const normalized = value.replace(/,/g, ".").replace(/[^0-9.]/g, "");
  if (!normalized) return "";

  const firstDot = normalized.indexOf(".");
  if (firstDot === -1) {
    return normalized;
  }

  const integerPart = normalized.slice(0, firstDot).replace(/\./g, "");
  const fractionPart = normalized.slice(firstDot + 1).replace(/\./g, "");
  return `${integerPart}.${fractionPart}`;
}

/** Parse sanitized decimal text; returns NaN for empty/invalid. */
export function parseDecimalInput(value: string): number {
  const sanitized = sanitizeDecimalInput(value);
  if (!sanitized || sanitized === ".") return NaN;
  return Number.parseFloat(sanitized);
}
