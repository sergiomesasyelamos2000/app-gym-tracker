import type { ExerciseRequestDto } from "@sergiomesasyelamos2000/shared";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import * as FileSystem from "expo-file-system/legacy";
import { getStaticExerciseImageUrl } from "../features/routine/utils/normalizeExerciseImage";

export type ExerciseMediaKind = "static" | "gif" | "video";

export type ExerciseMediaEntry = {
  sourceUrl: string;
  relativePath: string;
  bytes: number;
  savedAt: number;
};

export type ExerciseMediaFailure = { sourceUrl: string; failedAt: number };

export type ExerciseMediaRecord = {
  static?: ExerciseMediaEntry;
  gif?: ExerciseMediaEntry;
  video?: ExerciseMediaEntry;
  failures?: Partial<Record<ExerciseMediaKind, ExerciseMediaFailure>>;
};

export type MediaJob = {
  exerciseId: string;
  kind: ExerciseMediaKind;
  sourceUrl: string;
};

export const EXERCISE_MEDIA_INDEX_KEY = "@exercise_media_index_v1";
export const EXERCISE_MEDIA_CONCURRENCY = 3;
export const EXERCISE_MEDIA_MAX_BYTES = 600 * 1024 * 1024;
export const EXERCISE_MEDIA_FAIL_RETRY_MS = 6 * 60 * 60 * 1000;
export const EXERCISE_MEDIA_DOWNLOAD_TIMEOUT_MS = 20_000;

type MediaIndex = Record<string, ExerciseMediaRecord>;

const MEDIA_ROOT = "exercise-media";

let memoryIndex: MediaIndex | null = null;
let indexLoadPromise: Promise<void> | null = null;
let warmPromise: Promise<void> | null = null;
let pendingWarmExercises: ExerciseRequestDto[] | null = null;
let cacheGeneration = 0;
let writeChain: Promise<void> = Promise.resolve();
const listeners = new Set<() => void>();
const staticUrlToFile = new Map<string, string>();

function documentRoot(): string {
  const root = FileSystem.documentDirectory;
  if (!root) {
    throw new Error("[ExerciseMediaCache] documentDirectory unavailable");
  }
  return root.endsWith("/") ? root : `${root}/`;
}

/** Absolute root for local exercise media files (WebView allowlist). */
export function exerciseMediaDirectoryUri(): string {
  return `${documentRoot()}${MEDIA_ROOT}/`;
}

function withIndexLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeChain.then(fn, fn);
  writeChain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function absolutePath(relativePath: string): string {
  return `${documentRoot()}${relativePath}`;
}

export function safeExerciseId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "unknown";
}

function extensionFor(kind: ExerciseMediaKind, sourceUrl: string): string {
  const path = sourceUrl.split("?")[0] ?? sourceUrl;
  const match = path.match(/\.([a-zA-Z0-9]+)$/);
  const ext = match?.[1]?.toLowerCase();
  if (kind === "static") {
    if (ext === "png" || ext === "jpg" || ext === "jpeg" || ext === "webp") {
      return ext === "jpeg" ? "jpg" : ext;
    }
    return "jpg";
  }
  if (kind === "gif") {
    if (ext === "gif" || ext === "webp") return ext;
    return "gif";
  }
  if (ext === "mp4" || ext === "webm" || ext === "mov") return ext;
  return "mp4";
}

function relativeMediaPath(
  exerciseId: string,
  kind: ExerciseMediaKind,
  sourceUrl: string
): string {
  return `${MEDIA_ROOT}/${safeExerciseId(exerciseId)}/${kind}.${extensionFor(
    kind,
    sourceUrl
  )}`;
}

function isHttpUrl(value: string | null | undefined): value is string {
  if (!value || typeof value !== "string") return false;
  const trimmed = value.trim();
  return trimmed.startsWith("http://") || trimmed.startsWith("https://");
}

function getGifUrl(exercise: ExerciseRequestDto): string | null {
  const gift = (exercise as { giftUrl?: string | null }).giftUrl;
  const gif = (exercise as { gifUrl?: string | null }).gifUrl;
  if (isHttpUrl(gift)) return gift.trim();
  if (isHttpUrl(gif)) return gif.trim();
  return null;
}

function getVideoUrl(exercise: ExerciseRequestDto): string | null {
  const video = (exercise as { videoUrl?: string | null }).videoUrl;
  return isHttpUrl(video) ? video.trim() : null;
}

export function collectExerciseMediaJobs(
  exercises: ExerciseRequestDto[]
): MediaJob[] {
  const staticJobs: MediaJob[] = [];
  const gifJobs: MediaJob[] = [];
  const videoJobs: MediaJob[] = [];

  for (const exercise of exercises) {
    if (!exercise?.id) continue;
    const staticUrl = getStaticExerciseImageUrl(exercise);
    if (isHttpUrl(staticUrl)) {
      staticJobs.push({
        exerciseId: exercise.id,
        kind: "static",
        sourceUrl: staticUrl.trim(),
      });
    }

    const gifUrl = getGifUrl(exercise);
    if (gifUrl) {
      gifJobs.push({
        exerciseId: exercise.id,
        kind: "gif",
        sourceUrl: gifUrl,
      });
      continue;
    }

    const videoUrl = getVideoUrl(exercise);
    if (videoUrl) {
      videoJobs.push({
        exerciseId: exercise.id,
        kind: "video",
        sourceUrl: videoUrl,
      });
    }
  }

  return [...staticJobs, ...gifJobs, ...videoJobs];
}

function rebuildStaticUrlMap(index: MediaIndex): void {
  staticUrlToFile.clear();
  for (const record of Object.values(index)) {
    const entry = record.static;
    if (!entry) continue;
    staticUrlToFile.set(entry.sourceUrl, absolutePath(entry.relativePath));
  }
}

function notifyListeners(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // ignore subscriber errors
    }
  }
}

async function readIndexFromDisk(): Promise<MediaIndex> {
  try {
    const raw = await AsyncStorage.getItem(EXERCISE_MEDIA_INDEX_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as MediaIndex;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeIndex(index: MediaIndex): Promise<void> {
  memoryIndex = index;
  rebuildStaticUrlMap(index);
  await AsyncStorage.setItem(EXERCISE_MEDIA_INDEX_KEY, JSON.stringify(index));
  notifyListeners();
}

export async function ensureExerciseMediaIndex(): Promise<void> {
  if (memoryIndex) return;
  if (indexLoadPromise) {
    await indexLoadPromise;
    return;
  }
  indexLoadPromise = (async () => {
    const generation = cacheGeneration;
    const index = await readIndexFromDisk();
    if (generation !== cacheGeneration) return;
    memoryIndex = index;
    rebuildStaticUrlMap(index);
  })().finally(() => {
    indexLoadPromise = null;
  });
  await indexLoadPromise;
}

function getIndexSync(): MediaIndex {
  return memoryIndex ?? {};
}

/** Cap applies to motion files only — static images are always downloaded. */
function motionBytes(index: MediaIndex): number {
  let sum = 0;
  for (const record of Object.values(index)) {
    if (record.gif) sum += record.gif.bytes;
    if (record.video) sum += record.video.bytes;
  }
  return sum;
}

function entryUri(entry: ExerciseMediaEntry | undefined): string | null {
  if (!entry) return null;
  return absolutePath(entry.relativePath);
}

export function peekExerciseLocalMedia(exerciseId: string): {
  videoUri: string | null;
  gifUri: string | null;
  staticUri: string | null;
} {
  const record = getIndexSync()[exerciseId];
  if (!record) {
    return { videoUri: null, gifUri: null, staticUri: null };
  }
  return {
    videoUri: entryUri(record.video),
    gifUri: entryUri(record.gif),
    staticUri: entryUri(record.static),
  };
}

export function peekCachedStaticUri(sourceUrl: string): string | null {
  if (!sourceUrl?.trim()) return null;
  return staticUrlToFile.get(sourceUrl.trim()) ?? null;
}

export function subscribeExerciseMedia(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function ensureDir(path: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  }
}

async function deleteQuietly(path: string): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) {
      await FileSystem.deleteAsync(path, { idempotent: true });
    }
  } catch {
    // ignore
  }
}

async function pruneExerciseMedia(
  exercises: ExerciseRequestDto[]
): Promise<void> {
  const index = { ...getIndexSync() };
  const keepIds = new Set(exercises.map((e) => e.id).filter(Boolean));
  let changed = false;

  for (const [id, record] of Object.entries(index)) {
    if (!keepIds.has(id)) {
      await deleteQuietly(`${documentRoot()}${MEDIA_ROOT}/${safeExerciseId(id)}`);
      delete index[id];
      changed = true;
      continue;
    }

    const exercise = exercises.find((e) => e.id === id);
    if (!exercise) continue;

    const staticUrl = getStaticExerciseImageUrl(exercise);
    const gifUrl = getGifUrl(exercise);
    const videoUrl = getVideoUrl(exercise);
    let next = { ...record };

    if (record.static && isHttpUrl(staticUrl) && record.static.sourceUrl !== staticUrl.trim()) {
      await deleteQuietly(absolutePath(record.static.relativePath));
      const { static: _s, ...rest } = next;
      next = rest;
      changed = true;
    }

    if (record.gif && (!gifUrl || record.gif.sourceUrl !== gifUrl)) {
      await deleteQuietly(absolutePath(record.gif.relativePath));
      const { gif: _g, ...rest } = next;
      next = rest;
      changed = true;
    }

    // Drop video entry when a GIF URL now exists (one motion file policy).
    if (record.video && (gifUrl || (videoUrl && record.video.sourceUrl !== videoUrl))) {
      await deleteQuietly(absolutePath(record.video.relativePath));
      const { video: _v, ...rest } = next;
      next = rest;
      changed = true;
    }

    index[id] = next;
  }

  // Drop orphan files under exercise-media/
  try {
    const root = `${documentRoot()}${MEDIA_ROOT}`;
    const rootInfo = await FileSystem.getInfoAsync(root);
    if (rootInfo.exists) {
      const dirs = await FileSystem.readDirectoryAsync(root);
      const indexedSafeIds = new Set(
        Object.keys(index).map((id) => safeExerciseId(id))
      );
      for (const dir of dirs) {
        if (!indexedSafeIds.has(dir)) {
          await deleteQuietly(`${root}/${dir}`);
        }
      }
    }
  } catch {
    // ignore orphan scan failures
  }

  if (changed) {
    await writeIndex(index);
  }
}

function shouldSkipFailure(
  record: ExerciseMediaRecord | undefined,
  kind: ExerciseMediaKind,
  sourceUrl: string,
  now: number
): boolean {
  const failure = record?.failures?.[kind];
  if (!failure) return false;
  if (failure.sourceUrl !== sourceUrl) return false;
  return now - failure.failedAt < EXERCISE_MEDIA_FAIL_RETRY_MS;
}

async function markFailure(
  exerciseId: string,
  kind: ExerciseMediaKind,
  sourceUrl: string,
  generation: number
): Promise<void> {
  await withIndexLock(async () => {
    if (generation !== cacheGeneration) return;
    const index = { ...getIndexSync() };
    const existing = index[exerciseId] ?? {};
    index[exerciseId] = {
      ...existing,
      failures: {
        ...existing.failures,
        [kind]: { sourceUrl, failedAt: Date.now() },
      },
    };
    await writeIndex(index);
  });
}

async function markSuccess(
  exerciseId: string,
  kind: ExerciseMediaKind,
  entry: ExerciseMediaEntry,
  generation: number
): Promise<void> {
  await withIndexLock(async () => {
    if (generation !== cacheGeneration) return;
    const index = { ...getIndexSync() };
    const existing = index[exerciseId] ?? {};
    const failures = { ...existing.failures };
    delete failures[kind];
    const next: ExerciseMediaRecord = {
      ...existing,
      [kind]: entry,
      failures: Object.keys(failures).length > 0 ? failures : undefined,
    };
    // One motion file: if saving gif, drop video entry.
    if (kind === "gif" && next.video) {
      await deleteQuietly(absolutePath(next.video.relativePath));
      delete next.video;
    }
    if (generation !== cacheGeneration) return;
    index[exerciseId] = next;
    await writeIndex(index);
  });
}

async function downloadJob(
  job: MediaJob,
  generation: number
): Promise<void> {
  if (generation !== cacheGeneration) return;

  const relativePath = relativeMediaPath(
    job.exerciseId,
    job.kind,
    job.sourceUrl
  );
  const abs = absolutePath(relativePath);
  const parent = abs.slice(0, abs.lastIndexOf("/"));
  await ensureDir(parent);
  if (generation !== cacheGeneration) return;

  const download = FileSystem.createDownloadResumable(job.sourceUrl, abs);
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    void download.cancelAsync().catch(() => undefined);
  }, EXERCISE_MEDIA_DOWNLOAD_TIMEOUT_MS);

  try {
    const result = await download.downloadAsync();
    clearTimeout(timer);
    if (generation !== cacheGeneration) {
      await deleteQuietly(abs);
      return;
    }
    if (timedOut || !result) {
      await deleteQuietly(abs);
      await markFailure(job.exerciseId, job.kind, job.sourceUrl, generation);
      return;
    }
    const status = result.status ?? 0;
    if (status < 200 || status >= 300) {
      await deleteQuietly(abs);
      await markFailure(job.exerciseId, job.kind, job.sourceUrl, generation);
      return;
    }
    const info = await FileSystem.getInfoAsync(abs);
    const size =
      info.exists && "size" in info && typeof info.size === "number"
        ? info.size
        : 0;
    if (!info.exists || size <= 0) {
      await deleteQuietly(abs);
      await markFailure(job.exerciseId, job.kind, job.sourceUrl, generation);
      return;
    }
    await markSuccess(
      job.exerciseId,
      job.kind,
      {
        sourceUrl: job.sourceUrl,
        relativePath,
        bytes: size,
        savedAt: Date.now(),
      },
      generation
    );
  } catch {
    clearTimeout(timer);
    await deleteQuietly(abs);
    if (generation === cacheGeneration) {
      await markFailure(job.exerciseId, job.kind, job.sourceUrl, generation);
    }
  }
}

async function isDeviceOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return (
    state.isConnected === true &&
    (state.isInternetReachable === true || state.isInternetReachable == null)
  );
}

async function runWarm(
  exercises: ExerciseRequestDto[],
  generation: number
): Promise<void> {
  if (generation !== cacheGeneration) return;
  await ensureExerciseMediaIndex();
  if (generation !== cacheGeneration) return;
  await pruneExerciseMedia(exercises);
  if (generation !== cacheGeneration) return;

  const online = await isDeviceOnline();
  if (!online || generation !== cacheGeneration) {
    return;
  }

  const jobs = collectExerciseMediaJobs(exercises);
  const now = Date.now();
  const queue: MediaJob[] = [];
  for (const job of jobs) {
    const record = getIndexSync()[job.exerciseId];
    const existing = record?.[job.kind];
    if (existing && existing.sourceUrl === job.sourceUrl) {
      try {
        const info = await FileSystem.getInfoAsync(
          absolutePath(existing.relativePath)
        );
        if (info.exists) {
          continue;
        }
      } catch {
        // fall through and redownload
      }
    }
    if (shouldSkipFailure(record, job.kind, job.sourceUrl, now)) {
      continue;
    }
    queue.push(job);
  }

  let cursor = 0;
  let motionCapReached = false;
  const workers = Array.from(
    { length: Math.min(EXERCISE_MEDIA_CONCURRENCY, queue.length) },
    async () => {
      while (cursor < queue.length) {
        if (generation !== cacheGeneration) return;
        const index = cursor;
        cursor += 1;
        const job = queue[index];
        if (!job) break;

        if (job.kind !== "static") {
          if (
            motionCapReached ||
            motionBytes(getIndexSync()) >= EXERCISE_MEDIA_MAX_BYTES
          ) {
            motionCapReached = true;
            continue;
          }
        }

        await downloadJob(job, generation);
      }
    }
  );

  await Promise.all(workers);
}

/**
 * Fire-and-forget warm of exercise media files for the full catalog.
 * Concurrent calls coalesce onto a single worker that always runs the latest list.
 */
export function warmExerciseMediaCache(
  exercises: ExerciseRequestDto[]
): void {
  if (!exercises?.length) return;
  pendingWarmExercises = exercises;
  if (warmPromise) return;

  warmPromise = (async () => {
    while (pendingWarmExercises) {
      const batch = pendingWarmExercises;
      pendingWarmExercises = null;
      const generation = cacheGeneration;
      await runWarm(batch, generation);
    }
  })().finally(() => {
    warmPromise = null;
  });
}

/** Exposed for tests that need to await the warm cycle. */
export async function warmExerciseMediaCacheAsync(
  exercises: ExerciseRequestDto[]
): Promise<void> {
  await ensureExerciseMediaIndex();
  await runWarm(exercises, cacheGeneration);
}

export async function clearExerciseMediaCache(): Promise<void> {
  cacheGeneration += 1;
  pendingWarmExercises = null;
  memoryIndex = null;
  staticUrlToFile.clear();
  try {
    await AsyncStorage.removeItem(EXERCISE_MEDIA_INDEX_KEY);
  } catch {
    // ignore
  }
  try {
    await deleteQuietly(`${documentRoot()}${MEDIA_ROOT}`);
  } catch {
    // ignore
  }
  notifyListeners();
}

/** @internal test helper */
export function __resetExerciseMediaCacheForTests(): void {
  memoryIndex = null;
  indexLoadPromise = null;
  warmPromise = null;
  pendingWarmExercises = null;
  cacheGeneration = 0;
  writeChain = Promise.resolve();
  staticUrlToFile.clear();
  listeners.clear();
}
