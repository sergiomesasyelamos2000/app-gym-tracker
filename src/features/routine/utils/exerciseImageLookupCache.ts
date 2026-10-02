/** In-memory map of exerciseId → static image URL for session enrichment. */

let imageByExerciseIdCache: Map<string, string> | null = null;
let imageCachePromise: Promise<Map<string, string>> | null = null;

export function getExerciseImageLookupCache(): Map<string, string> | null {
  return imageByExerciseIdCache;
}

export function setExerciseImageLookupCache(map: Map<string, string>): void {
  imageByExerciseIdCache = map;
}

export function getExerciseImageLookupPromise(): Promise<Map<string, string>> | null {
  return imageCachePromise;
}

export function setExerciseImageLookupPromise(
  promise: Promise<Map<string, string>> | null
): void {
  imageCachePromise = promise;
}

/** Invalidate in-memory catalog image map (e.g. after catalog refresh). */
export function clearExerciseImageLookupCache(): void {
  imageByExerciseIdCache = null;
  imageCachePromise = null;
}
