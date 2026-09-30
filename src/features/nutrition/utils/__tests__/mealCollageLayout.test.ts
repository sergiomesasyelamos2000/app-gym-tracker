import {
  buildMealImagePayload,
  collectMealProductImageUrls,
  computeMealCollageLayout,
  inferLegacyMealImageSource,
  MEAL_COLLAGE_CANVAS,
} from "../mealCollageLayout";

describe("collectMealProductImageUrls", () => {
  it("dedupes and preserves order", () => {
    expect(
      collectMealProductImageUrls([
        { productImage: "https://a/1.jpg" },
        { productImage: "https://a/1.jpg" },
        { productImage: "https://a/2.jpg" },
      ]),
    ).toEqual(["https://a/1.jpg", "https://a/2.jpg"]);
  });
});

describe("computeMealCollageLayout", () => {
  it("layouts one and four cells", () => {
    expect(computeMealCollageLayout(1)[0]).toMatchObject({
      width: MEAL_COLLAGE_CANVAS,
      height: MEAL_COLLAGE_CANVAS,
    });
    expect(computeMealCollageLayout(4)).toHaveLength(4);
  });
});

describe("inferLegacyMealImageSource", () => {
  it("prefers explicit imageSource", () => {
    expect(
      inferLegacyMealImageSource({
        imageSource: "user",
        image: "https://cdn/p1.jpg",
        products: [{ productImage: "https://cdn/p1.jpg" }],
      }),
    ).toBe("user");
  });

  it("detects first-product legacy cover", () => {
    expect(
      inferLegacyMealImageSource({
        image: "https://cdn/p1.jpg",
        products: [{ productImage: "https://cdn/p1.jpg" }],
      }),
    ).toBe("collage");
  });
});

describe("buildMealImagePayload", () => {
  it("sends user kind with URI when user set a photo", () => {
    expect(
      buildMealImagePayload({
        userSetMealImage: true,
        userImageUri: "file:///photo.jpg",
      }),
    ).toEqual({ imageKind: "user", image: "file:///photo.jpg" });
  });

  it("sends auto with null image when clearing a user photo", () => {
    expect(
      buildMealImagePayload({
        userSetMealImage: false,
        userImageUri: null,
        clearedUserPhoto: true,
      }),
    ).toEqual({ imageKind: "auto", image: null });
  });

  it("sends auto without image when already in collage mode", () => {
    expect(
      buildMealImagePayload({
        userSetMealImage: false,
        userImageUri: null,
      }),
    ).toEqual({ imageKind: "auto" });
  });
});
