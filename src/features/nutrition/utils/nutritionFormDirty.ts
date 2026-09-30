import type { CustomMealResponseDto as CustomMeal } from "@sergiomesasyelamos2000/shared";

export interface MealProductDirtySnapshot {
  productCode: string;
  quantity: number;
  unit: string;
}

export interface CreateMealDirtyState {
  name: string;
  description: string;
  hasUserImage: boolean;
  productsCount: number;
}

export interface EditMealDirtyState {
  name: string;
  description: string;
  hasUserImage: boolean;
  imageUri: string | null;
  clearedUserPhoto: boolean;
  products: MealProductDirtySnapshot[];
}

export interface EditMealBaseline {
  name: string;
  description: string;
  hadUserImage: boolean;
  imageUri: string | null;
  products: MealProductDirtySnapshot[];
}

export interface NutritionalValuesDirtySnapshot {
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  sugar: string;
  sodium: string;
}

export interface CreateProductDirtyState {
  name: string;
  description: string;
  brand: string;
  barcode: string;
  servingSize: string;
  imageUri: string | null;
  nutritionalValues: NutritionalValuesDirtySnapshot;
}

export interface EditProductDirtyState extends CreateProductDirtyState {}

export interface EditProductBaseline extends CreateProductDirtyState {}

const normalizeText = (value: string | undefined | null): string =>
  (value ?? "").trim();

const hasAnyNutritionalInput = (
  values: NutritionalValuesDirtySnapshot,
): boolean =>
  Object.values(values).some((value) => normalizeText(value).length > 0);

const normalizeMealProducts = (
  products: MealProductDirtySnapshot[],
): MealProductDirtySnapshot[] =>
  [...products]
    .map((product) => ({
      productCode: product.productCode,
      quantity: product.quantity,
      unit: product.unit,
    }))
    .sort((a, b) => a.productCode.localeCompare(b.productCode));

export const mealProductsDirtyEqual = (
  current: MealProductDirtySnapshot[],
  baseline: MealProductDirtySnapshot[],
): boolean => {
  const normalizedCurrent = normalizeMealProducts(current);
  const normalizedBaseline = normalizeMealProducts(baseline);

  if (normalizedCurrent.length !== normalizedBaseline.length) {
    return false;
  }

  return normalizedCurrent.every((product, index) => {
    const other = normalizedBaseline[index];
    return (
      product.productCode === other.productCode &&
      product.quantity === other.quantity &&
      product.unit === other.unit
    );
  });
};

export const isCreateMealDirty = (state: CreateMealDirtyState): boolean => {
  if (normalizeText(state.name).length > 0) return true;
  if (normalizeText(state.description).length > 0) return true;
  if (state.hasUserImage) return true;
  if (state.productsCount > 0) return true;
  return false;
};

export const isEditMealDirty = (
  current: EditMealDirtyState,
  baseline: EditMealBaseline,
): boolean => {
  if (normalizeText(current.name) !== normalizeText(baseline.name)) return true;
  if (
    normalizeText(current.description) !== normalizeText(baseline.description)
  ) {
    return true;
  }

  const imageChanged =
    current.hasUserImage !== baseline.hadUserImage ||
    normalizeText(current.imageUri) !== normalizeText(baseline.imageUri) ||
    current.clearedUserPhoto;

  if (imageChanged) return true;

  return !mealProductsDirtyEqual(current.products, baseline.products);
};

export const isCreateProductDirty = (
  state: CreateProductDirtyState,
): boolean => {
  if (normalizeText(state.name).length > 0) return true;
  if (normalizeText(state.description).length > 0) return true;
  if (normalizeText(state.brand).length > 0) return true;
  if (normalizeText(state.barcode).length > 0) return true;
  if (normalizeText(state.servingSize).length > 0) return true;
  if (state.imageUri) return true;
  if (hasAnyNutritionalInput(state.nutritionalValues)) return true;
  return false;
};

export const isEditProductDirty = (
  current: EditProductDirtyState,
  baseline: EditProductBaseline,
): boolean => {
  if (normalizeText(current.name) !== normalizeText(baseline.name)) return true;
  if (
    normalizeText(current.description) !== normalizeText(baseline.description)
  ) {
    return true;
  }
  if (normalizeText(current.brand) !== normalizeText(baseline.brand)) {
    return true;
  }
  if (normalizeText(current.barcode) !== normalizeText(baseline.barcode)) {
    return true;
  }
  if (
    normalizeText(current.servingSize) !== normalizeText(baseline.servingSize)
  ) {
    return true;
  }
  if (normalizeText(current.imageUri) !== normalizeText(baseline.imageUri)) {
    return true;
  }

  const keys = Object.keys(current.nutritionalValues) as Array<
    keyof NutritionalValuesDirtySnapshot
  >;

  return keys.some(
    (key) =>
      normalizeText(current.nutritionalValues[key]) !==
      normalizeText(baseline.nutritionalValues[key]),
  );
};

export const mealProductsFromMeal = (
  meal: CustomMeal | undefined,
): MealProductDirtySnapshot[] => {
  if (!meal?.products?.length) return [];

  return meal.products.map((product) => ({
    productCode: product.productCode,
    quantity: product.quantity,
    unit: product.unit,
  }));
};
