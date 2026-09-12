import type { ExerciseRequestDto } from "@sergiomesasyelamos2000/shared";
import { isAnimatedExerciseImage } from "../../../utils/exerciseImage";

type ExerciseWithAltImage = ExerciseRequestDto & {
  image?: string | null;
  gifUrl?: string | null;
  giftUrl?: string | null;
  videoUrl?: string | null;
};

const isValidImageValue = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const getGifUrl = (exercise: ExerciseWithAltImage): string => {
  if (isValidImageValue(exercise.giftUrl)) return exercise.giftUrl.trim();
  if (isValidImageValue(exercise.gifUrl)) return exercise.gifUrl.trim();
  return "";
};

/**
 * Static thumbnail only: never gif/video. Returns null when unavailable.
 */
export function getStaticExerciseImageUrl(
  exercise: ExerciseWithAltImage
): string | null {
  const gifUrl = getGifUrl(exercise);
  const videoUrl = isValidImageValue(exercise.videoUrl)
    ? exercise.videoUrl.trim()
    : "";

  const candidates = [
    isValidImageValue(exercise.imageUrl) ? exercise.imageUrl.trim() : "",
    isValidImageValue(exercise.image) ? exercise.image.trim() : "",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (videoUrl && candidate === videoUrl) continue;
    if (isAnimatedExerciseImage(candidate, gifUrl)) continue;

    if (candidate.startsWith("data:image")) return candidate;
    if (candidate.startsWith("http://") || candidate.startsWith("https://")) {
      return candidate;
    }
    if (!candidate.startsWith("http") && candidate.length > 50) {
      return candidate.startsWith("data:")
        ? candidate
        : `data:image/jpeg;base64,${candidate}`;
    }
  }

  return null;
}

/**
 * Thumbnail for history/summary cards: prefer static, fall back to any
 * available image (including giftUrl) so thumbnails are not blank.
 */
export function getExerciseThumbnailUrl(
  exercise: ExerciseWithAltImage
): { uri: string | null; allowAnimated: boolean } {
  const staticUrl = getStaticExerciseImageUrl(exercise);
  if (staticUrl) {
    return { uri: staticUrl, allowAnimated: false };
  }

  const gifUrl = getGifUrl(exercise);
  const fallbackCandidates = [
    isValidImageValue(exercise.imageUrl) ? exercise.imageUrl.trim() : "",
    isValidImageValue(exercise.image) ? exercise.image.trim() : "",
    gifUrl,
  ].filter(Boolean);

  const fallback = fallbackCandidates[0] || null;
  return {
    uri: fallback,
    allowAnimated: Boolean(fallback),
  };
}

export function normalizeExerciseImage<T extends ExerciseWithAltImage>(
  exercise: T
): T {
  const staticImageUrl = getStaticExerciseImageUrl(exercise);

  if (staticImageUrl) {
    if (exercise.imageUrl === staticImageUrl) {
      return exercise;
    }
    return {
      ...exercise,
      imageUrl: staticImageUrl,
    };
  }

  // Do not fall back to gif/video for thumbnails — keep imageUrl empty.
  if (exercise.imageUrl) {
    return {
      ...exercise,
      imageUrl: undefined,
    };
  }

  return exercise;
}

export function normalizeExercisesImage<T extends ExerciseWithAltImage>(
  exercises: T[]
): T[] {
  return exercises.map(normalizeExerciseImage);
}
