export const SKELETON_OPACITY_MIN = 0.55;
export const SKELETON_OPACITY_MAX = 1;
export const SKELETON_PULSE_MS = 850;

/** Bone fill on card / secondary surfaces. */
export const SKELETON_BONE_ON_CARD = "card" as const;
/** Bone fill over a primary-colored header. */
export const SKELETON_BONE_ON_PRIMARY = "onPrimary" as const;

export type SkeletonBoneSurface =
  | typeof SKELETON_BONE_ON_CARD
  | typeof SKELETON_BONE_ON_PRIMARY;

export function skeletonBoneColor(
  theme: { backgroundSecondary: string },
  surface: SkeletonBoneSurface = SKELETON_BONE_ON_CARD
): string {
  if (surface === SKELETON_BONE_ON_PRIMARY) {
    return "rgba(255,255,255,0.45)";
  }
  return theme.backgroundSecondary;
}
