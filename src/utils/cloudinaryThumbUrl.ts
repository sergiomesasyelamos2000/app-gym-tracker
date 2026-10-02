/** Cloudinary transform for list thumbnails (~72pt cells). */
export const LIST_THUMB_TRANSFORM = "w_200,h_200,c_fill,f_auto,q_auto";

const UPLOAD_MARKER = "/image/upload/";

/**
 * Insert a list-size Cloudinary transform after `/image/upload/`.
 * Leaves data URIs, empty values, and non-Cloudinary hosts unchanged.
 */
export function toCloudinaryListThumbUrl(
  url: string | null | undefined
): string | null {
  if (url == null) return null;

  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  if (
    trimmed.startsWith("data:") ||
    (!trimmed.startsWith("http://") && !trimmed.startsWith("https://"))
  ) {
    return trimmed;
  }

  const markerIndex = trimmed.indexOf(UPLOAD_MARKER);
  if (markerIndex === -1) return trimmed;

  const afterUpload = trimmed.slice(markerIndex + UPLOAD_MARKER.length);
  if (
    afterUpload === LIST_THUMB_TRANSFORM ||
    afterUpload.startsWith(`${LIST_THUMB_TRANSFORM}/`)
  ) {
    return trimmed;
  }

  return `${trimmed.slice(0, markerIndex + UPLOAD_MARKER.length)}${LIST_THUMB_TRANSFORM}/${afterUpload}`;
}
