import type { ExerciseRequestDto } from "@sergiomesasyelamos2000/shared";
import {
  fetchExercises,
  peekExerciseCatalog,
} from "../../../services/exerciseService";
import { getStaticExerciseImageUrl } from "./normalizeExerciseImage";

type ExerciseMediaFields = ExerciseRequestDto & {
  gifUrl?: string | null;
};

const isNonEmpty = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const hasAnimatedOrVideoMedia = (exercise: ExerciseMediaFields): boolean =>
  isNonEmpty(exercise.videoUrl) ||
  isNonEmpty(exercise.giftUrl) ||
  isNonEmpty(exercise.gifUrl);

async function loadCatalogExercises(): Promise<ExerciseRequestDto[]> {
  const peeked = peekExerciseCatalog();
  if (peeked?.length) {
    return peeked;
  }
  return fetchExercises();
}

/**
 * When ExerciseDetail receives a slim session exercise (static image only),
 * fill missing video/gif URLs from the local exercise catalog.
 * Preserves session fields (sets, name, existing imageUrl).
 */
export async function hydrateExerciseMediaFromCatalog<
  T extends ExerciseMediaFields,
>(exercise: T): Promise<T> {
  if (!exercise?.id || hasAnimatedOrVideoMedia(exercise)) {
    return exercise;
  }

  try {
    const catalog = await loadCatalogExercises();
    const match = catalog.find((item) => item.id === exercise.id);
    if (!match) {
      return exercise;
    }

    const catalogMedia = match as ExerciseMediaFields;
    const nextGiftUrl =
      (isNonEmpty(catalogMedia.giftUrl) && catalogMedia.giftUrl.trim()) ||
      (isNonEmpty(catalogMedia.gifUrl) && catalogMedia.gifUrl.trim()) ||
      undefined;
    const nextVideoUrl = isNonEmpty(catalogMedia.videoUrl)
      ? catalogMedia.videoUrl.trim()
      : undefined;
    const nextImageUrl =
      exercise.imageUrl ||
      getStaticExerciseImageUrl(catalogMedia) ||
      (isNonEmpty(catalogMedia.imageUrl) ? catalogMedia.imageUrl.trim() : undefined);

    if (!nextGiftUrl && !nextVideoUrl && nextImageUrl === exercise.imageUrl) {
      return exercise;
    }

    return {
      ...exercise,
      ...(nextGiftUrl ? { giftUrl: nextGiftUrl } : {}),
      ...(nextVideoUrl ? { videoUrl: nextVideoUrl } : {}),
      ...(nextImageUrl && !exercise.imageUrl ? { imageUrl: nextImageUrl } : {}),
    };
  } catch {
    return exercise;
  }
}
