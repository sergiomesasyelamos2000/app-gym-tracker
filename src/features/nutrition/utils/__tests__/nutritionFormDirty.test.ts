import {
  isCreateMealDirty,
  isCreateProductDirty,
  isEditMealDirty,
  isEditProductDirty,
  mealProductsDirtyEqual,
} from "../nutritionFormDirty";

describe("nutritionFormDirty", () => {
  describe("isCreateMealDirty", () => {
    it("returns false for empty create form", () => {
      expect(
        isCreateMealDirty({
          name: "",
          description: "",
          hasUserImage: false,
          productsCount: 0,
        }),
      ).toBe(false);
    });

    it("returns true when any field has content", () => {
      expect(
        isCreateMealDirty({
          name: "Desayuno",
          description: "",
          hasUserImage: false,
          productsCount: 0,
        }),
      ).toBe(true);
    });
  });

  describe("isEditMealDirty", () => {
    const baseline = {
      name: "Comida",
      description: "Notas",
      hadUserImage: false,
      imageUri: null,
      products: [{ productCode: "a", quantity: 100, unit: "g" }],
    };

    it("returns false when unchanged", () => {
      expect(
        isEditMealDirty(
          {
            name: "Comida",
            description: "Notas",
            hasUserImage: false,
            imageUri: null,
            clearedUserPhoto: false,
            products: [{ productCode: "a", quantity: 100, unit: "g" }],
          },
          baseline,
        ),
      ).toBe(false);
    });

    it("returns true when products change", () => {
      expect(
        isEditMealDirty(
          {
            name: "Comida",
            description: "Notas",
            hasUserImage: false,
            imageUri: null,
            clearedUserPhoto: false,
            products: [{ productCode: "a", quantity: 120, unit: "g" }],
          },
          baseline,
        ),
      ).toBe(true);
    });
  });

  describe("mealProductsDirtyEqual", () => {
    it("ignores product order", () => {
      expect(
        mealProductsDirtyEqual(
          [
            { productCode: "b", quantity: 1, unit: "g" },
            { productCode: "a", quantity: 2, unit: "g" },
          ],
          [
            { productCode: "a", quantity: 2, unit: "g" },
            { productCode: "b", quantity: 1, unit: "g" },
          ],
        ),
      ).toBe(true);
    });
  });

  describe("isCreateProductDirty", () => {
    it("returns false for empty product form", () => {
      expect(
        isCreateProductDirty({
          name: "",
          description: "",
          brand: "",
          barcode: "",
          servingSize: "",
          imageUri: null,
          nutritionalValues: {
            calories: "",
            protein: "",
            carbs: "",
            fat: "",
            fiber: "",
            sugar: "",
            sodium: "",
          },
        }),
      ).toBe(false);
    });

    it("returns true when macros are filled", () => {
      expect(
        isCreateProductDirty({
          name: "",
          description: "",
          brand: "",
          barcode: "",
          servingSize: "",
          imageUri: null,
          nutritionalValues: {
            calories: "100",
            protein: "",
            carbs: "",
            fat: "",
            fiber: "",
            sugar: "",
            sodium: "",
          },
        }),
      ).toBe(true);
    });
  });

  describe("isEditProductDirty", () => {
    const baseline = {
      name: "Avena",
      description: "",
      brand: "",
      barcode: "",
      servingSize: "100",
      imageUri: null,
      nutritionalValues: {
        calories: "350",
        protein: "10",
        carbs: "60",
        fat: "7",
        fiber: "",
        sugar: "",
        sodium: "",
      },
    };

    it("returns false when unchanged", () => {
      expect(isEditProductDirty(baseline, baseline)).toBe(false);
    });

    it("returns true when name changes", () => {
      expect(
        isEditProductDirty({ ...baseline, name: "Avena integral" }, baseline),
      ).toBe(true);
    });
  });
});
