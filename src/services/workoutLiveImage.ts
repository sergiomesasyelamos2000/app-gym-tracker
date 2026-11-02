import { toCloudinaryListThumbUrl } from "../utils/cloudinaryThumbUrl";

/** Routine/exercise position shown on the iOS Live Activity (1-based index). */
export interface WorkoutLiveProgress {
  routineName?: string | null;
  exerciseIndex?: number | null;
  exerciseCount?: number | null;
  completedSets?: number | null;
  totalSets?: number | null;
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
  progress: WorkoutLiveProgress
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
