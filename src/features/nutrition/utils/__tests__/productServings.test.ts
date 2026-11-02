import {
  assembleProductServings,
  calculateMacrosForServing,
  mapUsdaFoodPortions,
  parsePackageServing,
  parseUsdaCode,
  pickDefaultServingId,
  resolveInitialQuantity,
} from "@sergiomesasyelamos2000/shared";

describe("productServings", () => {
  it("parses package serving from OFF string with paren grams", () => {
    const measure = parsePackageServing("1 banana (118 g)");
    expect(measure).toMatchObject({
      id: "package",
      grams: 118,
      kind: "package",
    });
  });

  it("parses direct gram serving", () => {
    expect(parsePackageServing("30g")?.grams).toBe(30);
  });

  it("maps USDA food portions and prefers medium as default", () => {
    const servings = assembleProductServings({
      usdaPortions: [
        {
          id: 1,
          sequenceNumber: 1,
          gramWeight: 81,
          modifier: "extra small",
        },
        {
          id: 2,
          sequenceNumber: 2,
          gramWeight: 118,
          modifier: "medium (7\" to 7-7/8\" long)",
        },
        {
          id: 3,
          sequenceNumber: 3,
          gramWeight: 136,
          portionDescription: "1 large",
        },
      ],
    });

    expect(servings.some((s) => s.kind === "household")).toBe(true);
    expect(servings.some((s) => s.id === "gram")).toBe(true);
    expect(pickDefaultServingId(servings)).toMatch(/usda-2/);
  });

  it("defaults to package serving when no household measures", () => {
    const servings = assembleProductServings({
      servingSize: "25 g",
    });
    expect(pickDefaultServingId(servings)).toBe("package");
    expect(resolveInitialQuantity(servings[0])).toBe("1");
  });

  it("defaults to ml for liquid categories", () => {
    const servings = assembleProductServings({
      categories: "Bebidas, Zumos",
    });
    expect(pickDefaultServingId(servings, { categories: "Bebidas" })).toBe(
      "ml"
    );
  });

  it("scales macros for 1 medium banana (118 g)", () => {
    const medium = mapUsdaFoodPortions([
      { id: 10, gramWeight: 118, modifier: "medium" },
    ])[0];
    const macros = calculateMacrosForServing(
      { calories: 89, protein: 1.09, carbohydrates: 22.84, fat: 0.33 },
      1,
      medium
    );
    expect(macros.calories).toBe(105);
    expect(macros.protein).toBeCloseTo(1.3, 1);
  });

  it("scales macros for grams measure", () => {
    const gram = assembleProductServings({})[0];
    const gramMeasure = assembleProductServings({}).find((s) => s.id === "gram")!;
    const macros = calculateMacrosForServing(
      { calories: 89, protein: 1.1, carbohydrates: 22.8, fat: 0.3 },
      100,
      gramMeasure
    );
    expect(macros.calories).toBe(89);
    expect(gram.id).toBeDefined();
  });

  it("parses usda- code", () => {
    expect(parseUsdaCode("usda-173944")).toBe(173944);
    expect(parseUsdaCode("841000000")).toBeNull();
  });
});
