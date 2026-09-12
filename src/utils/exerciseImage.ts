/**
 * Helpers to prefer static exercise thumbnails over animated gif/video media.
 */

const isValidImageValue = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

/** GIF87a / GIF89a in base64 always starts with R0lGOD */
const isGifBase64Payload = (value: string): boolean => {
  const payload = value.startsWith("data:")
    ? value.slice(value.indexOf(",") + 1)
    : value;
  return payload.startsWith("R0lGOD");
};

/**
 * True when the value is an animated GIF (URL, data URI, or raw base64).
 */
export function isAnimatedExerciseImage(
  imageUrl: string | null | undefined,
  gifUrl?: string | null
): boolean {
  if (!isValidImageValue(imageUrl)) return false;

  const trimmed = imageUrl.trim();
  const normalizedGif = isValidImageValue(gifUrl) ? gifUrl.trim() : "";

  if (normalizedGif && trimmed === normalizedGif) return true;
  if (trimmed.startsWith("data:image/gif")) return true;
  if (/\.gif([?#]|$)/i.test(trimmed)) return true;
  // CDN paths that serve GIFs without a .gif extension
  if (/\/gifs?(\/|[?#]|$)/i.test(trimmed)) return true;
  if (/[?&](format|type)=gif\b/i.test(trimmed)) return true;
  if (!trimmed.startsWith("http") && isGifBase64Payload(trimmed)) return true;

  return false;
}
