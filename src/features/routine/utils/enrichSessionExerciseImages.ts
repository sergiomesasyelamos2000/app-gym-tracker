import type { ExerciseRequestDto } from "@sergiomesasyelamos2000/shared";
import { fetchExercises } from "../../../services/exerciseService";
import {
  getExerciseImageLookupCache,
  getExerciseImageLookupPromise,
  setExerciseImageLookupCache,
  setExerciseImageLookupPromise,
} from "./exerciseImageLookupCache";
import { getStaticExerciseImageUrl } from "./normalizeExerciseImage";

export { clearExerciseImageLookupCache } from "./exerciseImageLookupCache";

type SessionExerciseLike = {
  exerciseId?: string;
  id?: string;
  name?: string;
  imageUrl?: string | null;
  giftUrl?: string | null;
  [key: string]: unknown;
};

async function loadExerciseImageMap(): Promise<Map<string, string>> {
  const cached = getExerciseImageLookupCache();
  if (cached) {
    return cached;
  }

  const existingPromise = getExerciseImageLookupPromise();
  if (existingPromise) {
    return existingPromise;
  }

  const promise = (async () => {
    const exercises = await fetchExercises();
    const map = new Map<string, string>();
    for (const exercise of exercises) {
      const uri = getStaticExerciseImageUrl(
        exercise as ExerciseRequestDto & { image?: string | null }
      );
      if (uri && exercise.id) {
        map.set(exercise.id, uri);
      }
    }
    setExerciseImageLookupCache(map);
    return map;
  })().finally(() => {
    setExerciseImageLookupPromise(null);
  });

  setExerciseImageLookupPromise(promise);
  return promise;
}

/**
 * Fill missing session exercise thumbnails from the local exercise catalog.
 * Used after API stopped embedding imageUrl/giftUrl in session jsonb.
 */
export async function enrichSessionExercisesWithCatalogImages<
  T extends SessionExerciseLike,
>(exercises: T[]): Promise<T[]> {
  if (!exercises?.length) return exercises;

  const needsLookup = exercises.some((exercise) => {
    const id = exercise.exerciseId || exercise.id;
    return Boolean(id) && !exercise.imageUrl;
  });
  if (!needsLookup) return exercises;

  try {
    const imageMap = await loadExerciseImageMap();
    return exercises.map((exercise) => {
      if (exercise.imageUrl) return exercise;
      const id = exercise.exerciseId || exercise.id;
      if (!id) return exercise;
      const catalogImage = imageMap.get(id);
      if (!catalogImage) return exercise;
      return { ...exercise, imageUrl: catalogImage };
    });
  } catch {
    return exercises;
  }
}
