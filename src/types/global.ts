/**
 * Tipos globales y utilidades de TypeScript
 * Mejora la seguridad de tipos y reduce el boilerplate
 */

// ============= Tipos de Utilidad =============

/**
 * Representa un valor que puede ser null
 */
export type Nullable<T> = T | null;

/**
 * Representa un valor que puede ser undefined
 */
export type Optional<T> = T | undefined;

/**
 * Representa un valor que puede ser null o undefined
 */
export type Maybe<T> = T | null | undefined;

/**
 * Representa un valor que no es null ni undefined
 */
export type NonNullable<T> = T extends null | undefined ? never : T;

// ============= Tipos de API =============

/**
 * Respuesta exitosa de la API
 */
export interface ApiResponse<T> {
  data: T;
  message?: string;
  timestamp: string;
}

/**
 * Error de la API
 */
export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

/**
 * Respuesta de la API que puede ser exitosa o error
 */
export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };

// ============= Tipos de Estado Asíncrono =============

/**
 * Estado de una operación asíncrona
 */
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * Estado completo de una operación asíncrona con datos
 */
export interface AsyncState<T> {
  status: AsyncStatus;
  data: Nullable<T>;
  error: Nullable<Error>;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

// ============= Result Pattern =============

/**
 * Tipo Result para manejo de errores funcional
 * Alternativa a try-catch que fuerza el manejo explícito de errores
 */
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * Helper para crear un Result exitoso
 */
export const Ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

/**
 * Helper para crear un Result con error
 */
export const Err = <E>(error: E): Result<never, E> => ({ ok: false, error });

// ============= Tipos de ID =============

/**
 * ID único de usuario
 */
export type UserId = string & { readonly __brand: 'UserId' };

/**
 * ID único de producto
 */
export type ProductId = string & { readonly __brand: 'ProductId' };

/**
 * ID único de rutina
 */
export type RoutineId = string & { readonly __brand: 'RoutineId' };

/**
 * ID único genérico
 */
export type EntityId = string & { readonly __brand: 'EntityId' };

// ============= Tipos de Validación =============

/**
 * String no vacío
 */
export type NonEmptyString = string & { readonly __brand: 'NonEmptyString' };

/**
 * Número positivo
 */
export type PositiveNumber = number & { readonly __brand: 'PositiveNumber' };

/**
 * Email válido
 */
export type Email = string & { readonly __brand: 'Email' };

// ============= Tipos de Fecha =============

/**
 * Fecha en formato ISO 8601
 */
export type ISODateString = string & { readonly __brand: 'ISODateString' };

/**
 * Timestamp en milisegundos
 */
export type Timestamp = number & { readonly __brand: 'Timestamp' };

// ============= Tipos Condicionales =============

/**
 * Extrae las llaves de un tipo que son de cierto tipo
 */
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

/**
 * Hace que ciertas propiedades sean requeridas
 */
export type RequiredKeys<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Hace que ciertas propiedades sean opcionales
 */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Deep Partial - hace todas las propiedades anidadas opcionales
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Deep Readonly - hace todas las propiedades anidadas readonly
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

// ============= Tipos de Función =============

/**
 * Función asíncrona genérica
 */
export type AsyncFunction<T = void> = (...args: any[]) => Promise<T>;

/**
 * Callback genérico
 */
export type Callback<T = void> = (value: T) => void;

/**
 * Predicado (función que retorna boolean)
 */
export type Predicate<T> = (value: T) => boolean;

// ============= Tipos de Paginación =============

/**
 * Parámetros de paginación
 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset?: number;
}

/**
 * Respuesta paginada
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  totalPages: number;
}

// ============= Tipos de Formulario =============

/**
 * Estado de campo de formulario
 */
export interface FieldState<T> {
  value: T;
  error: Nullable<string>;
  touched: boolean;
  dirty: boolean;
}

/**
 * Estado de formulario completo
 */
export interface FormState<T extends Record<string, any>> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
  isSubmitting: boolean;
}

// ============= Declaraciones Globales =============

declare global {
  /**
   * Extensión de Window para propiedades personalizadas
   */
  interface Window {
    __DEV__?: boolean;
    __REDUX_DEVTOOLS_EXTENSION__?: any;
  }

  /**
   * Variables de entorno
   */
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      EXPO_PUBLIC_API_URL?: string;
    }
  }
}

export {};
