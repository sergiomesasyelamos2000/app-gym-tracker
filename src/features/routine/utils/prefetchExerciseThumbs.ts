import { Image } from "react-native";
import { peekExerciseCatalog } from "../../../services/exerciseCatalogCache";
import { toCloudinaryListThumbUrl } from "../../../utils/cloudinaryThumbUrl";
import { getStaticExerciseImageUrl } from "./normalizeExerciseImage";

type ExerciseLike = {
  imageUrl?: string | null;
  image?: string | null;
  giftUrl?: string | null;
  gifUrl?: string | null;
  videoUrl?: string | null;
};

const prefetchedThumbUris = new Set<string>();
const prefetchPromises = new Map<string, Promise<boolean>>();

export type PrefetchExerciseThumbsOptions = {
  /** Inclusive start index into the exercises array. */
  startIndex?: number;
  /** How many rows to consider from startIndex (visible + lookahead). */
  count?: number;
  /** Max new prefetches to queue in this call. */
  limit?: number;
};

export type WaitForExerciseThumbsOptions = PrefetchExerciseThumbsOptions & {
  /** Max time to wait before revealing the list anyway. */
  timeoutMs?: number;
};

/** Default catalog head warm after login / boot catalog prefetch. */
export const CATALOG_THUMB_WARM_COUNT = 40;

function collectThumbUrls(
  exercises: ExerciseLike[],
  options: PrefetchExerciseThumbsOptions = {}
): string[] {
  const startIndex = Math.max(0, options.startIndex ?? 0);
  const count = options.count ?? 18;
  const limit = options.limit ?? 30;
  if (!exercises.length || count <= 0 || limit <= 0) return [];

  const slice = exercises.slice(startIndex, startIndex + count);
  const urls: string[] = [];

  for (const exercise of slice) {
    if (urls.length >= limit) break;

    const staticUrl = getStaticExerciseImageUrl(exercise);
    if (!staticUrl || !staticUrl.startsWith("http")) continue;

    const thumbUrl = toCloudinaryListThumbUrl(staticUrl) ?? staticUrl;
    if (!thumbUrl || urls.includes(thumbUrl)) continue;
    urls.push(thumbUrl);
  }

  return urls;
}

function queueThumbPrefetch(uri: string): Promise<boolean> {
  const inFlight = prefetchPromises.get(uri);
  if (inFlight) return inFlight;

  // Completed URLs stay in the set — skip re-hitting Image.prefetch.
  if (prefetchedThumbUris.has(uri)) {
    return Promise.resolve(true);
  }

  prefetchedThumbUris.add(uri);
  const promise = Image.prefetch(uri)
    .then(() => true)
    .catch(() => {
      prefetchedThumbUris.delete(uri);
      return false;
    })
    .finally(() => {
      prefetchPromises.delete(uri);
    });

  prefetchPromises.set(uri, promise);
  return promise;
}

/**
 * Prefetch Cloudinary list-thumb URLs (same transform as CachedExerciseImage variant=thumb).
 * Dedupes with an in-memory Set so scroll/open do not re-hit the network.
 */
export function prefetchExerciseThumbBatch(
  exercises: ExerciseLike[],
  options: PrefetchExerciseThumbsOptions = {}
): void {
  for (const uri of collectThumbUrls(exercises, options)) {
    void queueThumbPrefetch(uri);
  }
}

/**
 * Wait until the first viewport thumbs finish prefetching or timeout (for skeleton reveal).
 */
export async function waitForExerciseThumbBatch(
  exercises: ExerciseLike[],
  options: WaitForExerciseThumbsOptions = {}
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? 450;
  const urls = collectThumbUrls(exercises, options);
  if (!urls.length) return;

  const waits = urls.map((uri) => queueThumbPrefetch(uri));
  await Promise.race([
    Promise.all(waits),
    new Promise<void>((resolve) => {
      setTimeout(resolve, timeoutMs);
    }),
  ]);
}

/** Warm thumbs for the default catalog order (after JSON catalog is in memory). */
export function warmExerciseCatalogThumbs(): void {
  const catalog = peekExerciseCatalog();
  if (!catalog?.length) return;

  prefetchExerciseThumbBatch(catalog, {
    startIndex: 0,
    count: CATALOG_THUMB_WARM_COUNT,
    limit: CATALOG_THUMB_WARM_COUNT,
  });
}

/** Test helper — clears the in-memory prefetch set. */
export function clearPrefetchedExerciseThumbs(): void {
  prefetchedThumbUris.clear();
  prefetchPromises.clear();
}
