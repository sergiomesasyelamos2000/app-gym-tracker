import type { FoodUnit, ProductServingMeasure } from "@sergiomesasyelamos2000/shared";
import {
  assembleProductServings,
  pickDefaultServingId,
  resolveInitialQuantity,
} from "@sergiomesasyelamos2000/shared";

export function ensureProductServings(product: {
  servingSize?: string | null;
  categories?: string | null;
  servings?: ProductServingMeasure[] | null;
}): ProductServingMeasure[] {
  if (product.servings && product.servings.length > 0) {
    return product.servings;
  }
  return assembleProductServings({
    servingSize: product.servingSize,
    categories: product.categories,
  });
}

export function measureToFoodUnit(measure: ProductServingMeasure): FoodUnit {
  if (measure.kind === "gram") return "gram";
  if (measure.kind === "ml") return "ml";
  return "portion";
}

export function resolveServingSelection(input: {
  servings: ProductServingMeasure[];
  categories?: string | null;
  initialUnit?: FoodUnit | string | null;
  initialQty?: number | null;
  servingSizeHint?: number | null;
}): { servingId: string; quantity: string } {
  const { servings, categories, initialUnit, initialQty, servingSizeHint } =
    input;

  if (servings.length === 0) {
    return { servingId: "gram", quantity: "100" };
  }

  if (initialUnit === "gram" || initialUnit === "g") {
    const gram = servings.find((s) => s.kind === "gram") ?? servings[0];
    return {
      servingId: gram.id,
      quantity:
        initialQty && initialQty > 0
          ? String(initialQty)
          : resolveInitialQuantity(gram, { preferredGrams: servingSizeHint }),
    };
  }

  if (initialUnit === "ml") {
    const ml = servings.find((s) => s.kind === "ml") ?? servings[0];
    return {
      servingId: ml.id,
      quantity:
        initialQty && initialQty > 0
          ? String(initialQty)
          : resolveInitialQuantity(ml),
    };
  }

  if (initialUnit === "portion" || initialUnit === "unit") {
    const portion =
      servings.find((s) => s.kind === "household" || s.kind === "package") ??
      servings[0];
    return {
      servingId: portion.id,
      quantity:
        initialQty && initialQty > 0
          ? String(initialQty)
          : resolveInitialQuantity(portion),
    };
  }

  const defaultId = pickDefaultServingId(servings, { categories });
  const measure = servings.find((s) => s.id === defaultId) ?? servings[0];
  return {
    servingId: measure.id,
    quantity: resolveInitialQuantity(measure, {
      preferredGrams: servingSizeHint,
    }),
  };
}
