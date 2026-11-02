import { toLiveActivityImageUrl, toNativeProgress } from "../workoutLiveImage";

describe("toLiveActivityImageUrl", () => {
  it("returns null for empty values", () => {
    expect(toLiveActivityImageUrl(null)).toBeNull();
    expect(toLiveActivityImageUrl(undefined)).toBeNull();
    expect(toLiveActivityImageUrl("   ")).toBeNull();
  });

  it("rewrites Cloudinary uploads to the small thumb transform", () => {
    expect(
      toLiveActivityImageUrl(
        "https://res.cloudinary.com/demo/image/upload/v1/exercises/bench.jpg"
      )
    ).toBe(
      "https://res.cloudinary.com/demo/image/upload/w_200,h_200,c_fill,f_auto,q_auto/v1/exercises/bench.jpg"
    );
  });

  it("keeps non-Cloudinary https URLs unchanged", () => {
    const url = "https://cdn.exercisedb.dev/bodyparts/chest.webp";
    expect(toLiveActivityImageUrl(url)).toBe(url);
  });

  it("keeps data URIs so native can decode them", () => {
    const uri = "data:image/jpeg;base64,AAAA";
    expect(toLiveActivityImageUrl(uri)).toBe(uri);
  });

  it("drops unsupported values such as relative paths", () => {
    expect(toLiveActivityImageUrl("exercises/bench.jpg")).toBeNull();
  });
});

describe("toNativeProgress", () => {
  it("keeps only valid fields so native never receives null entries", () => {
    expect(
      toNativeProgress({
        routineName: "Pierna",
        exerciseIndex: 2,
        exerciseCount: 5,
        completedSets: null,
        totalSets: 4,
      })
    ).toEqual({
      routineName: "Pierna",
      exerciseIndex: 2,
      exerciseCount: 5,
      totalSets: 4,
    });
  });

  it("drops non-finite and negative numbers", () => {
    expect(
      toNativeProgress({
        exerciseIndex: Number.NaN,
        totalSets: -1,
        completedSets: 0,
      })
    ).toEqual({ completedSets: 0 });
  });

  it("returns an empty object when there is no progress", () => {
    expect(toNativeProgress({})).toEqual({});
  });
});
