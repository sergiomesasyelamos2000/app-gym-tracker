export type RetailBarcodeGate =
  | { ok: true; canonical: string }
  | {
      ok: false;
      reason: "empty" | "url" | "non_digit" | "bad_length" | "bad_checksum";
    };

const GS1_AI_01 = /\(01\)\s*(\d{14})/;
const RETAIL_TYPES = new Set([
  "ean13",
  "ean8",
  "upc_a",
  "upc_e",
  "itf14",
]);
const FALLBACK_TYPES = new Set(["code128", "datamatrix", "qr"]);

export function isValidGtinChecksum(digits: string): boolean {
  if (!/^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(digits)) {
    return false;
  }
  const body = digits.slice(0, -1);
  let sum = 0;
  for (let i = 0; i < body.length; i += 1) {
    const digit = Number(body[body.length - 1 - i]);
    sum += digit * (i % 2 === 0 ? 3 : 1);
  }
  const check = (10 - (sum % 10)) % 10;
  return check === Number(digits[digits.length - 1]);
}

/**
 * Camera-side GTIN gate (same checksum rules as API normalizeGtin).
 */
export function normalizeRetailBarcode(raw: string): RetailBarcodeGate {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) {
    return { ok: false, reason: "empty" };
  }

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.includes("://")
  ) {
    return { ok: false, reason: "url" };
  }

  const aiMatch = trimmed.match(GS1_AI_01);
  let digits = aiMatch?.[1] ?? trimmed.replace(/\D/g, "");

  if (!aiMatch && digits.length === 16 && digits.startsWith("01")) {
    digits = digits.slice(2);
  }

  if (!digits) {
    return { ok: false, reason: "non_digit" };
  }

  if (![8, 12, 13, 14].includes(digits.length)) {
    return { ok: false, reason: "bad_length" };
  }

  if (digits.length === 12) {
    const ean13 = `0${digits}`;
    if (!isValidGtinChecksum(ean13)) {
      return { ok: false, reason: "bad_checksum" };
    }
    return { ok: true, canonical: ean13 };
  }

  if (digits.length === 14) {
    if (!isValidGtinChecksum(digits)) {
      return { ok: false, reason: "bad_checksum" };
    }
    const withoutIndicator = digits.slice(1);
    if (isValidGtinChecksum(withoutIndicator)) {
      return { ok: true, canonical: withoutIndicator };
    }
    return { ok: true, canonical: digits };
  }

  if (!isValidGtinChecksum(digits)) {
    return { ok: false, reason: "bad_checksum" };
  }

  return { ok: true, canonical: digits };
}

export function isRetailBarcodeType(type: string | undefined): boolean {
  return RETAIL_TYPES.has((type ?? "").toLowerCase());
}

export function isFallbackBarcodeType(type: string | undefined): boolean {
  return FALLBACK_TYPES.has((type ?? "").toLowerCase());
}

export type ConfirmBarcodeState = {
  candidate: string | null;
  firstSeenAt: number | null;
};

/**
 * Require two identical canonical reads within windowMs before accepting.
 */
export function confirmRetailBarcodeRead(
  state: ConfirmBarcodeState,
  canonical: string,
  now: number,
  windowMs = 1500,
): { accepted: true; next: ConfirmBarcodeState } | { accepted: false; next: ConfirmBarcodeState } {
  if (
    state.candidate === canonical &&
    state.firstSeenAt != null &&
    now - state.firstSeenAt <= windowMs
  ) {
    return {
      accepted: true,
      next: { candidate: null, firstSeenAt: null },
    };
  }

  return {
    accepted: false,
    next: { candidate: canonical, firstSeenAt: now },
  };
}
