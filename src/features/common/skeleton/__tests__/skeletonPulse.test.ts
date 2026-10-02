import {
  SKELETON_OPACITY_MAX,
  SKELETON_OPACITY_MIN,
  SKELETON_PULSE_MS,
  skeletonBoneColor,
} from "../skeletonPulse";

describe("skeletonPulse", () => {
  it("exports the shared pulse constants", () => {
    expect(SKELETON_OPACITY_MIN).toBe(0.55);
    expect(SKELETON_OPACITY_MAX).toBe(1);
    expect(SKELETON_PULSE_MS).toBe(850);
  });

  it("resolves bone colors for card and primary surfaces", () => {
    const theme = { backgroundSecondary: "#F8FAFC" };
    expect(skeletonBoneColor(theme, "card")).toBe("#F8FAFC");
    expect(skeletonBoneColor(theme, "onPrimary")).toBe(
      "rgba(255,255,255,0.45)"
    );
  });
});
