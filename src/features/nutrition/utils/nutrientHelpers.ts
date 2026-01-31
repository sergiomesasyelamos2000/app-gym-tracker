export interface BaseNutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const calculateNutrients = (
  nutrients: BaseNutrients,
  servingSize: string,
  servingUnit: string,
): BaseNutrients => {
  const size = parseFloat(servingSize) || 0;

  if (size === 0) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  }

  // Base values are typically for 100g/100ml
  // If unit is "normalized" (like 100g), the factor is size / 100
  // But if the product data is per 100g, we need to know that.
  // Assuming standard convention: product nutrients are per 100 units.

  const factor = size / 100;

  // Handle "serving" or "unit" if applicable in future logic
  // For now, assuming standard weight/volume based scaling

  return {
    calories: Math.round(nutrients.calories * factor),
    protein: Math.round(nutrients.protein * factor * 10) / 10,
    carbs: Math.round(nutrients.carbs * factor * 10) / 10,
    fat: Math.round(nutrients.fat * factor * 10) / 10,
  };
};
