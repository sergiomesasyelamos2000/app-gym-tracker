/**
 * Tipos comunes reutilizables en toda la aplicación
 */

// ============= Theme Types =============

/**
 * Tema de la aplicación
 */
export interface AppTheme {
  background: string;
  primary: string;
  secondary: string;
  text: string;
  textSecondary: string;
  border: string;
  card: string;
  error: string;
  success: string;
  warning: string;
  info: string;
  [key: string]: string; // Permite propiedades adicionales
}

/**
 * Context de tema
 */
export interface ThemeContext {
  theme: AppTheme;
  isDark: boolean;
  toggleTheme?: () => void;
}

// ============= Navigation Types =============

/**
 * Tipo base de navegación de React Navigation
 */
export interface BaseNavigation {
  navigate: (screen: string, params?: Record<string, unknown>) => void;
  goBack: () => void;
  push: (screen: string, params?: Record<string, unknown>) => void;
  pop: (count?: number) => void;
  popToTop: () => void;
  replace: (screen: string, params?: Record<string, unknown>) => void;
  reset: (state: unknown) => void;
  setParams: (params: Record<string, unknown>) => void;
  getParent: () => BaseNavigation | undefined;
}

/**
 * Route params genéricos
 */
export interface RouteParams {
  [key: string]: unknown;
}

// ============= Session/Exercise Types =============

/**
 * Set de ejercicio
 */
export interface ExerciseSet {
  id: string;
  weight: number;
  reps: number;
  completed: boolean;
  rir?: number;
  notes?: string;
}

/**
 * Ejercicio en sesión
 */
export interface SessionExercise {
  id: string;
  exerciseId: string;
  name: string;
  sets: ExerciseSet[];
  notes?: string;
  restTime?: number;
}

/**
 * Datos de sesión
 */
export interface SessionData {
  id: string;
  routineId: string;
  exercises: SessionExercise[];
  startTime: Date | string;
  endTime?: Date | string;
  duration?: number;
  notes?: string;
}

// ============= Error Types =============

/**
 * Error capturado en catch block
 */
export type CaughtError = Error | { message: string } | string | unknown;

/**
 * Helper para extraer mensaje de error de forma segura
 */
export function getErrorMessage(error: CaughtError): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'Un error desconocido ocurrió';
}

/**
 * Helper para extraer código de error HTTP
 */
export function getErrorStatusCode(error: CaughtError): number | undefined {
  if (error && typeof error === 'object' && 'statusCode' in error) {
    const code = (error as { statusCode: unknown }).statusCode;
    return typeof code === 'number' ? code : undefined;
  }
  return undefined;
}

// ============= Form Types =============

/**
 * Opciones de picker genérico
 */
export interface PickerOption<T = string> {
  label: string;
  value: T;
}

/**
 * Configuración de campo de formulario
 */
export interface FieldConfig {
  label: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
  errorText?: string;
}

// ============= List/Scroll Types =============

/**
 * Item de FlatList con key obligatorio
 */
export interface ListItem {
  key: string;
  [key: string]: unknown;
}

/**
 * Props de renderizado de FlatList
 */
export interface RenderItemProps<T> {
  item: T;
  index: number;
}

// ============= Style Types =============

/**
 * Estilo de React Native
 */
export type StyleProp = Record<string, unknown> | Array<Record<string, unknown>> | undefined;

/**
 * Objeto de estilos creado con StyleSheet
 */
export type StylesObject = Record<string, Record<string, unknown>>;
