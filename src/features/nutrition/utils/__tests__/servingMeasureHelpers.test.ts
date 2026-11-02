import {
  ensureProductServings,
  measureToFoodUnit,
  resolveServingSelection,
} from "../servingMeasureHelpers";

describe("servingMeasureHelpers", () => {
  it("reuses existing servings when present", () => {
    const servings = ensureProductServings({
      servings: [
        { id: "gram", label: "Gramos", grams: 1, kind: "gram" },
        {
          id: "usda-1",
          label: "1 medium (118 g)",
          grams: 118,
          kind: "household",
        },
      ],
    });
    expect(servings).toHaveLength(2);
    expect(resolveServingSelection({ servings }).servingId).toBe("usda-1");
  });

  it("maps measure kinds to food units", () => {
    expect(
      measureToFoodUnit({ id: "gram", label: "Gramos", grams: 1, kind: "gram" })
    ).toBe("gram");
    expect(
      measureToFoodUnit({ id: "ml", label: "Mililitros", grams: 1, kind: "ml" })
    ).toBe("ml");
    expect(
      measureToFoodUnit({
        id: "p",
        label: "1 medium",
        grams: 118,
        kind: "household",
      })
    ).toBe("portion");
  });
});
