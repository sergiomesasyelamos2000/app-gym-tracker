export interface NutritionItem {
  name: string;
  calories: number;
  proteins: { quantity: number; unit: string };
  carbs: { quantity: number; unit: string };
  fats: { quantity: number; unit: string };
  servingSize: number;
}
