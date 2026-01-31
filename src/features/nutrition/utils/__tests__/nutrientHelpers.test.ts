import { calculateNutrients, BaseNutrients } from "../nutrientHelpers";

describe("nutrientHelpers", () => {
  const baseProduct: BaseNutrients = {
    calories: 100,
    protein: 20,
    carbs: 10,
    fat: 5,
  };

  describe("calculateNutrients", () => {
    it("should scale nutrients correctly for 200g (double)", () => {
      const result = calculateNutrients(baseProduct, "200", "g");
      expect(result.calories).toBe(200);
      expect(result.protein).toBe(40);
      expect(result.carbs).toBe(20);
      expect(result.fat).toBe(10);
    });

    it("should scale nutrients correctly for 50g (half)", () => {
      const result = calculateNutrients(baseProduct, "50", "g");
      expect(result.calories).toBe(50);
      expect(result.protein).toBe(10);
      expect(result.carbs).toBe(5);
      expect(result.fat).toBe(2.5);
    });

    it("should handle zero amount", () => {
      const result = calculateNutrients(baseProduct, "0", "g");
      expect(result.calories).toBe(0);
      expect(result.protein).toBe(0);
      expect(result.carbs).toBe(0);
      expect(result.fat).toBe(0);
    });

    it("should handle empty or invalid numeric string", () => {
      const result = calculateNutrients(baseProduct, "", "g");
      expect(result.calories).toBe(0);
    });

    it("should round decimals correctly", () => {
      const decimalProduct: BaseNutrients = {
        calories: 100,
        protein: 3.33,
        carbs: 3.33,
        fat: 3.33,
      };

      // 100g -> 3.33
      // 300g -> 9.99
      const result = calculateNutrients(decimalProduct, "300", "g");
      expect(result.protein).toBe(10); // 9.99 rounded to 1 decimal? No, logic is *factor.
      // 3.33 * 3 = 9.99. Math.round(9.99 * 10) / 10 = 100/10 = 10.
      expect(result.protein).toBe(10);
    });
  });
});
