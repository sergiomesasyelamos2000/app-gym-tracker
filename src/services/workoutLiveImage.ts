import { toCloudinaryListThumbUrl } from "../utils/cloudinaryThumbUrl";

/** Routine/exercise position shown on the iOS Live Activity (1-based index). */
export interface WorkoutLiveProgress {
  routineName?: string | null;
  exerciseIndex?: number | null;
  exerciseCount?: number | null;
  completedSets?: number | null;
  totalSets?: number | null;
}

/** Pause clock fields folded into the iOS progress NSDictionary. */
export interface WorkoutLivePauseBridge {
  isPaused?: boolean;
  pausedElapsedSeconds?: number | null;
}

const PROGRESS_NUMBER_KEYS = [
  "exerciseIndex",
  "exerciseCount",
  "completedSets",
  "totalSets",
] as const;

/**
 * Payload for the native bridge: drops null/invalid entries because the Swift
 * side reads an NSDictionary and must never see NSNull values.
 */
export function toNativeProgress(
  progress: WorkoutLiveProgress,
  pause?: WorkoutLivePauseBridge | null
): Record<string, string | number> {
  const payload: Record<string, string | number> = {};
  const name = progress.routineName?.trim();
  if (name) payload.routineName = name;
  for (const key of PROGRESS_NUMBER_KEYS) {
    const value = progress[key];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      payload[key] = Math.floor(value);
    }
  }
  // Always send isPaused (0/1) so resume clears a previously frozen clock.
  payload.isPaused = pause?.isPaused ? 1 : 0;
  if (pause?.isPaused) {
    const frozen = pause.pausedElapsedSeconds;
    payload.pausedElapsedSeconds =
      typeof frozen === "number" && Number.isFinite(frozen)
        ? Math.max(0, Math.floor(frozen))
        : 0;
  }
  return payload;
}

/**
 * Image source for the iOS Live Activity / Android notification.
 * Live Activities cannot render full-size images, so Cloudinary uploads are
 * requested at thumb size; native still downsamples before storing.
 */
export function toLiveActivityImageUrl(
  url: string | null | undefined
): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("data:image")) return trimmed;
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return null;
  }

  return toCloudinaryListThumbUrl(trimmed) ?? trimmed;
}
