/**
 * Type Mappers para unidades de medida
 * Provee conversiones type-safe entre diferentes sistemas de unidades
 */

import { FoodUnit, WeightUnit, HeightUnit } from '@entity-data-models/index';

// ============= Unidades Locales =============

/**
 * Unidades de comida usadas localmente en la app
 */
export type LocalFoodUnit = 'g' | 'ml' | 'portion';

/**
 * Unidades de peso usadas localmente
 */
export type LocalWeightUnit = 'kg' | 'lb';

/**
 * Unidades de altura usadas localmente
 */
export type LocalHeightUnit = 'cm' | 'in';

// ============= Mappers de Comida =============

/**
 * Mapeo de unidades locales a unidades de API
 */
const FOOD_UNIT_MAPPING: Record<LocalFoodUnit, FoodUnit> = {
  g: 'gram',
  ml: 'ml',
  portion: 'portion',
} as const;

/**
 * Mapeo inverso de unidades de API a locales
 */
const FOOD_UNIT_REVERSE_MAPPING: Record<FoodUnit, LocalFoodUnit> = {
  gram: 'g',
  ml: 'ml',
  portion: 'portion',
  custom: 'portion', // Fallback para custom
} as const;

/**
 * Convierte unidad local a unidad de API
 */
export function localToApiFoodUnit(unit: LocalFoodUnit): FoodUnit {
  return FOOD_UNIT_MAPPING[unit];
}

/**
 * Convierte unidad de API a unidad local
 */
export function apiToLocalFoodUnit(unit: FoodUnit): LocalFoodUnit {
  return FOOD_UNIT_REVERSE_MAPPING[unit];
}

/**
 * Type guard para validar unidad local de comida
 */
export function isLocalFoodUnit(value: unknown): value is LocalFoodUnit {
  return typeof value === 'string' && value in FOOD_UNIT_MAPPING;
}

// ============= Mappers de Peso =============

/**
 * Mapeo de unidades locales de peso a unidades de API
 */
const WEIGHT_UNIT_MAPPING: Record<LocalWeightUnit, WeightUnit> = {
  kg: WeightUnit.KG,
  lb: WeightUnit.LBS, // Corregido: LBS, no LB
} as const;

/**
 * Mapeo inverso de unidades de API a locales
 */
const WEIGHT_UNIT_REVERSE_MAPPING: Record<WeightUnit, LocalWeightUnit> = {
  [WeightUnit.KG]: 'kg',
  [WeightUnit.LBS]: 'lb', // Corregido: LBS, no LB
} as const;

/**
 * Convierte unidad local de peso a unidad de API
 */
export function localToApiWeightUnit(unit: LocalWeightUnit): WeightUnit {
  return WEIGHT_UNIT_MAPPING[unit];
}

/**
 * Convierte unidad de API a unidad local de peso
 */
export function apiToLocalWeightUnit(unit: WeightUnit): LocalWeightUnit {
  return WEIGHT_UNIT_REVERSE_MAPPING[unit];
}

/**
 * Type guard para validar unidad local de peso
 */
export function isLocalWeightUnit(value: unknown): value is LocalWeightUnit {
  return typeof value === 'string' && value in WEIGHT_UNIT_MAPPING;
}

// ============= Mappers de Altura =============

/**
 * Mapeo de unidades locales de altura a unidades de API
 * Nota: HeightUnit usa 'ft' (feet) no 'in' (inches)
 */
const HEIGHT_UNIT_MAPPING: Record<LocalHeightUnit, HeightUnit> = {
  cm: 'cm',
  in: 'ft', // API usa 'ft' (feet), local usa 'in' para simplificar
} as const;

/**
 * Mapeo inverso de unidades de API a locales
 */
const HEIGHT_UNIT_REVERSE_MAPPING: Record<HeightUnit, LocalHeightUnit> = {
  cm: 'cm',
  ft: 'in', // API usa 'ft' (feet), local usa 'in'
} as const;

/**
 * Convierte unidad local de altura a unidad de API
 */
export function localToApiHeightUnit(unit: LocalHeightUnit): HeightUnit {
  return HEIGHT_UNIT_MAPPING[unit];
}

/**
 * Convierte unidad de API a unidad local de altura
 */
export function apiToLocalHeightUnit(unit: HeightUnit): LocalHeightUnit {
  return HEIGHT_UNIT_REVERSE_MAPPING[unit];
}

/**
 * Type guard para validar unidad local de altura
 */
export function isLocalHeightUnit(value: unknown): value is LocalHeightUnit {
  return typeof value === 'string' && value in HEIGHT_UNIT_MAPPING;
}

// ============= Labels y Display =============

/**
 * Labels para mostrar en UI (unidades de comida)
 */
export const FOOD_UNIT_LABELS: Record<LocalFoodUnit, string> = {
  g: 'gramos',
  ml: 'mililitros',
  portion: 'porción',
} as const;

/**
 * Labels para mostrar en UI (unidades de peso)
 */
export const WEIGHT_UNIT_LABELS: Record<LocalWeightUnit, string> = {
  kg: 'kilogramos',
  lb: 'libras',
} as const;

/**
 * Labels para mostrar en UI (unidades de altura)
 */
export const HEIGHT_UNIT_LABELS: Record<LocalHeightUnit, string> = {
  cm: 'centímetros',
  in: 'pulgadas',
} as const;

/**
 * Obtiene el label display de una unidad de comida
 */
export function getFoodUnitLabel(unit: LocalFoodUnit): string {
  return FOOD_UNIT_LABELS[unit];
}

/**
 * Obtiene el label display de una unidad de peso
 */
export function getWeightUnitLabel(unit: LocalWeightUnit): string {
  return WEIGHT_UNIT_LABELS[unit];
}

/**
 * Obtiene el label display de una unidad de altura
 */
export function getHeightUnitLabel(unit: LocalHeightUnit): string {
  return HEIGHT_UNIT_LABELS[unit];
}

// ============= Conversiones Numéricas =============

/**
 * Factores de conversión de peso
 */
const WEIGHT_CONVERSION_FACTORS: Record<LocalWeightUnit, number> = {
  kg: 1,
  lb: 0.453592, // 1 lb = 0.453592 kg
} as const;

/**
 * Convierte peso a kilogramos
 */
export function convertWeightToKg(value: number, unit: LocalWeightUnit): number {
  return value * WEIGHT_CONVERSION_FACTORS[unit];
}

/**
 * Convierte kilogramos a otra unidad
 */
export function convertKgToWeight(kg: number, targetUnit: LocalWeightUnit): number {
  return kg / WEIGHT_CONVERSION_FACTORS[targetUnit];
}

/**
 * Factores de conversión de altura
 */
const HEIGHT_CONVERSION_FACTORS: Record<LocalHeightUnit, number> = {
  cm: 1,
  in: 2.54, // 1 in = 2.54 cm
} as const;

/**
 * Convierte altura a centímetros
 */
export function convertHeightToCm(value: number, unit: LocalHeightUnit): number {
  return value * HEIGHT_CONVERSION_FACTORS[unit];
}

/**
 * Convierte centímetros a otra unidad
 */
export function convertCmToHeight(cm: number, targetUnit: LocalHeightUnit): number {
  return cm / HEIGHT_CONVERSION_FACTORS[targetUnit];
}
