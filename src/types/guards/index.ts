/**
 * Type Guards
 * Funciones para verificar tipos en runtime de forma type-safe
 */

import type { MappedProduct as Product } from "@sergiomesasyelamos2000/shared";
import { ApiError, ApiResponse, ApiResult } from "../global";

// ============= Guards Básicos =============

/**
 * Verifica si un valor no es null ni undefined
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Verifica si un valor es null
 */
export function isNull(value: unknown): value is null {
  return value === null;
}

/**
 * Verifica si un valor es undefined
 */
export function isUndefined(value: unknown): value is undefined {
  return value === undefined;
}

/**
 * Verifica si un valor es null o undefined
 */
export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

// ============= Guards de Strings =============

/**
 * Verifica si un valor es un string
 */
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * Verifica si un valor es un string no vacío
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Verifica si un valor es un email válido
 */
export function isEmail(value: unknown): value is string {
  if (!isString(value)) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

// ============= Guards de Números =============

/**
 * Verifica si un valor es un número
 */
export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value);
}

/**
 * Verifica si un valor es un número positivo
 */
export function isPositiveNumber(value: unknown): value is number {
  return isNumber(value) && value > 0;
}

/**
 * Verifica si un valor es un número no negativo (>= 0)
 */
export function isNonNegativeNumber(value: unknown): value is number {
  return isNumber(value) && value >= 0;
}

/**
 * Verifica si un valor es un entero
 */
export function isInteger(value: unknown): value is number {
  return isNumber(value) && Number.isInteger(value);
}

// ============= Guards de Arrays =============

/**
 * Verifica si un valor es un array
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Verifica si un valor es un array no vacío
 */
export function isNonEmptyArray<T>(value: unknown): value is [T, ...T[]] {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Verifica si un valor es un array de un tipo específico
 */
export function isArrayOf<T>(
  value: unknown,
  guard: (item: unknown) => item is T
): value is T[] {
  return isArray(value) && value.every(guard);
}

// ============= Guards de Objetos =============

/**
 * Verifica si un valor es un objeto (no array, no null)
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Verifica si un objeto tiene una propiedad específica
 */
export function hasProperty<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> {
  return isObject(obj) && key in obj;
}

/**
 * Verifica si un objeto tiene múltiples propiedades
 */
export function hasProperties<K extends string>(
  obj: unknown,
  keys: K[]
): obj is Record<K, unknown> {
  return isObject(obj) && keys.every((key) => key in obj);
}

// ============= Guards de Fechas =============

/**
 * Verifica si un valor es una fecha válida
 */
export function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Verifica si un string es una fecha ISO válida
 */
export function isISODateString(value: unknown): value is string {
  if (!isString(value)) return false;
  const date = new Date(value);
  return isDate(date);
}

// ============= Guards de API =============

/**
 * Verifica si un valor es una respuesta de API exitosa
 */
export function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  return (
    isObject(value) &&
    hasProperty(value, "data") &&
    hasProperty(value, "timestamp") &&
    isString(value.timestamp)
  );
}

/**
 * Verifica si un valor es un error de API
 */
export function isApiError(value: unknown): value is ApiError {
  return (
    isObject(value) &&
    hasProperty(value, "code") &&
    hasProperty(value, "message") &&
    hasProperty(value, "statusCode") &&
    isString(value.code) &&
    isString(value.message) &&
    isNumber(value.statusCode)
  );
}

/**
 * Verifica si un ApiResult es exitoso
 */
export function isApiSuccess<T>(
  result: ApiResult<T>
): result is { success: true; data: T } {
  return result.success === true;
}

/**
 * Verifica si un ApiResult es un error
 */
export function isApiFailure<T>(
  result: ApiResult<T>
): result is { success: false; error: ApiError } {
  return result.success === false;
}

// ============= Guards de Error =============

/**
 * Verifica si un valor es una instancia de Error
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Verifica si un valor tiene propiedades de error
 */
export function isErrorLike(
  value: unknown
): value is { message: string; name?: string; stack?: string } {
  return (
    isObject(value) && hasProperty(value, "message") && isString(value.message)
  );
}

// ============= Guards de Modelos =============

/**
 * Verifica si un valor es un Product válido
 */
export function isProduct(value: unknown): value is Product {
  return (
    isObject(value) &&
    hasProperty(value, "id") &&
    hasProperty(value, "name") &&
    hasProperty(value, "barcode") &&
    isString(value.id) &&
    isString(value.name)
  );
}

/**
 * Verifica si un valor es un array de Products
 */
export function isProductArray(value: unknown): value is Product[] {
  return isArrayOf(value, isProduct);
}

// ============= Guards de Promesas =============

/**
 * Verifica si un valor es una Promise
 */
export function isPromise<T = unknown>(value: unknown): value is Promise<T> {
  return (
    isObject(value) &&
    hasProperty(value, "then") &&
    typeof value.then === "function"
  );
}

// ============= Guards de Funciones =============

/**
 * Verifica si un valor es una función
 */
export function isFunction(value: unknown): value is (...args: any[]) => any {
  return typeof value === "function";
}

/**
 * Verifica si un valor es una función asíncrona
 */
export function isAsyncFunction(
  value: unknown
): value is (...args: any[]) => Promise<any> {
  return isFunction(value) && value.constructor.name === "AsyncFunction";
}

// ============= Guards Compuestos =============

/**
 * Combina múltiples guards con AND lógico
 */
export function allOf<T>(
  value: unknown,
  guards: Array<(v: unknown) => v is T>
): value is T {
  return guards.every((guard) => guard(value));
}

/**
 * Combina múltiples guards con OR lógico
 */
export function anyOf<T>(
  value: unknown,
  guards: Array<(v: unknown) => v is T>
): value is T {
  return guards.some((guard) => guard(value));
}

/**
 * Niega un guard
 */
export function not<T>(
  value: unknown,
  guard: (v: unknown) => v is T
): value is Exclude<unknown, T> {
  return !guard(value);
}

// ============= Guards de Valores Específicos =============

/**
 * Verifica si un valor es uno de los valores permitidos
 */
export function isOneOf<T extends readonly unknown[]>(
  value: unknown,
  allowedValues: T
): value is T[number] {
  return allowedValues.includes(value);
}

/**
 * Verifica si un valor es una clave de un objeto
 */
export function isKeyOf<T extends object>(
  value: unknown,
  obj: T
): value is keyof T {
  return isString(value) && value in obj;
}

// ============= Guards de React Native =============

/**
 * Verifica si el entorno es desarrollo
 */
export function isDevelopment(): boolean {
  return __DEV__ === true;
}

/**
 * Verifica si el entorno es producción
 */
export function isProduction(): boolean {
  return !isDevelopment();
}
