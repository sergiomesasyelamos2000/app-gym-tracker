/**
 * Calcula el 1RM estimado usando la fórmula de Epley
 * 1RM = weight * (1 + reps / 30)
 *
 * @param weight - Peso levantado en kg
 * @param reps - Número de repeticiones
 * @returns 1RM estimado en kg
 */
export function calculate1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  if (reps === 0 || weight === 0) return 0;

  // Fórmula de Epley es más precisa para reps < 10
  if (reps <= 10) {
    return weight * (1 + reps / 30);
  }

  // Fórmula de Brzycki para reps más altas
  return weight * (36 / (37 - reps));
}

/**
 * Calcula el volumen total (peso × reps)
 */
export function calculateVolume(weight: number, reps: number): number {
  return weight * reps;
}

export interface ExerciseProgressDataPoint {
  date: string; // ISO date string
  maxWeight: number;
  totalReps: number;
  totalSets: number;
  totalVolume: number;
  estimated1RM: number;
  sessionId?: string;
}

export interface ExerciseSet {
  weight: number;
  reps: number;
  completed: boolean;
}

export interface ExerciseInSession {
  exerciseId: string;
  name: string;
  sets: ExerciseSet[];
}

export interface RoutineSession {
  id: string;
  createdAt: string;
  exercises: ExerciseInSession[];
}

function toLocalDateKey(value: string | Date): string {
  const parsed = value instanceof Date ? value : new Date(value);

  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  if (typeof value === "string" && value.includes("T")) {
    return value.split("T")[0];
  }

  return typeof value === "string" ? value : "";
}

function startOfLocalDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

/**
 * Extrae los datos de progreso de un ejercicio específico desde el historial de sesiones
 *
 * @param exerciseId - ID del ejercicio
 * @param sessions - Array de sesiones de rutina
 * @returns Array de puntos de datos de progreso
 */
export function getExerciseProgressData(
  exerciseId: string,
  sessions: RoutineSession[]
): ExerciseProgressDataPoint[] {
  const progressData: ExerciseProgressDataPoint[] = [];

  sessions.forEach((session) => {
    const exercise = session.exercises.find((ex) => ex.exerciseId === exerciseId);

    if (!exercise) return;

    const completedSets = exercise.sets.filter((set) => set.completed);

    if (completedSets.length === 0) return;

    // Calcular métricas para esta sesión
    const maxWeight = Math.max(...completedSets.map((set) => set.weight));
    const totalReps = completedSets.reduce((sum, set) => sum + set.reps, 0);
    const totalSets = completedSets.length;
    const totalVolume = completedSets.reduce(
      (sum, set) => sum + calculateVolume(set.weight, set.reps),
      0
    );

    // Calcular 1RM más alto de la sesión
    const estimated1RMs = completedSets.map((set) =>
      calculate1RM(set.weight, set.reps)
    );
    const estimated1RM = Math.max(...estimated1RMs);

    progressData.push({
      date: session.createdAt,
      maxWeight,
      totalReps,
      totalSets,
      totalVolume,
      estimated1RM,
      sessionId: session.id,
    });
  });

  // Ordenar por fecha (más antiguo primero)
  return progressData.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

/**
 * Agrupa los datos por fecha (yyyy-mm-dd) y calcula promedios/totales
 * Útil cuando hay múltiples sesiones en el mismo día
 */
export function aggregateByDate(
  data: ExerciseProgressDataPoint[]
): ExerciseProgressDataPoint[] {
  const grouped = new Map<string, ExerciseProgressDataPoint[]>();

  data.forEach((point) => {
    const dateKey = toLocalDateKey(point.date);
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(point);
  });

  const aggregated: ExerciseProgressDataPoint[] = [];

  grouped.forEach((points, dateKey) => {
    const maxWeight = Math.max(...points.map((p) => p.maxWeight));
    const totalReps = points.reduce((sum, p) => sum + p.totalReps, 0);
    const totalSets = points.reduce((sum, p) => sum + p.totalSets, 0);
    const totalVolume = points.reduce((sum, p) => sum + p.totalVolume, 0);
    const estimated1RM = Math.max(...points.map((p) => p.estimated1RM));

    aggregated.push({
      // Sin sufijo Z para evitar desplazamientos UTC en el filtrado por día local.
      date: `${dateKey}T00:00:00`,
      maxWeight,
      totalReps,
      totalSets,
      totalVolume,
      estimated1RM,
    });
  });

  return aggregated.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

/**
 * Filtra los datos por período de tiempo
 *
 * @param data - Datos de progreso
 * @param days - Número de días hacia atrás (0 = todo el historial)
 * @returns Datos filtrados
 */
export function filterByPeriod(
  data: ExerciseProgressDataPoint[],
  days: number
): ExerciseProgressDataPoint[] {
  if (days === 0) return data;

  // Ventana por días calendario locales, incluyendo el día de hoy.
  const todayStart = startOfLocalDay(new Date());
  const cutoffDate = new Date(todayStart);
  cutoffDate.setDate(cutoffDate.getDate() - (days - 1));

  return data.filter((point) => {
    const pointDate = startOfLocalDay(
      new Date(`${toLocalDateKey(point.date)}T00:00:00`)
    );
    return pointDate >= cutoffDate && pointDate <= todayStart;
  });
}

/**
 * Calcula estadísticas resumen del progreso
 */
export interface ProgressStats {
  bestWeight: number;
  averageWeight: number;
  best1RM: number;
  average1RM: number;
  totalVolume: number;
  totalSessions: number;
  trend: "up" | "down" | "stable" | "no-data";
}

export function calculateProgressStats(
  data: ExerciseProgressDataPoint[]
): ProgressStats {
  if (data.length === 0) {
    return {
      bestWeight: 0,
      averageWeight: 0,
      best1RM: 0,
      average1RM: 0,
      totalVolume: 0,
      totalSessions: 0,
      trend: "no-data",
    };
  }

  const bestWeight = Math.max(...data.map((p) => p.maxWeight));
  const averageWeight =
    data.reduce((sum, p) => sum + p.maxWeight, 0) / data.length;
  const best1RM = Math.max(...data.map((p) => p.estimated1RM));
  const average1RM =
    data.reduce((sum, p) => sum + p.estimated1RM, 0) / data.length;
  const totalVolume = data.reduce((sum, p) => sum + p.totalVolume, 0);
  const totalSessions = data.length;

  // Calcular tendencia (comparar primeras 3 sesiones vs últimas 3)
  let trend: "up" | "down" | "stable" | "no-data" = "stable";

  if (data.length >= 6) {
    const firstThree = data.slice(0, 3);
    const lastThree = data.slice(-3);

    const avgFirst = firstThree.reduce((sum, p) => sum + p.maxWeight, 0) / 3;
    const avgLast = lastThree.reduce((sum, p) => sum + p.maxWeight, 0) / 3;

    const percentChange = ((avgLast - avgFirst) / avgFirst) * 100;

    if (percentChange > 5) trend = "up";
    else if (percentChange < -5) trend = "down";
    else trend = "stable";
  }

  return {
    bestWeight,
    averageWeight: Math.round(averageWeight * 10) / 10,
    best1RM: Math.round(best1RM * 10) / 10,
    average1RM: Math.round(average1RM * 10) / 10,
    totalVolume,
    totalSessions,
    trend,
  };
}

/** Period windows used by exercise progress / detail teaser. */
export type ExerciseAnalysisPeriod = 7 | 30 | 90 | 0;

export const EXERCISE_ANALYSIS_PERIODS: ExerciseAnalysisPeriod[] = [
  7, 30, 90, 0,
];

export const EXERCISE_ANALYSIS_PERIOD_LABELS: Record<
  ExerciseAnalysisPeriod,
  string
> = {
  7: "7 días",
  30: "30 días",
  90: "90 días",
  0: "Todo",
};

/** Fixed teaser window on exercise detail. */
export const EXERCISE_PROGRESS_TEASER_PERIOD: ExerciseAnalysisPeriod = 30;

export function normalizeExerciseAnalysisPeriod(
  value: unknown
): ExerciseAnalysisPeriod {
  if (value === 7 || value === 30 || value === 90 || value === 0) {
    return value;
  }
  return 30;
}

export function percentDelta(
  current: number,
  previous: number
): number | null {
  if (!(previous > 0) || !Number.isFinite(current) || !Number.isFinite(previous)) {
    return null;
  }
  return ((current - previous) / previous) * 100;
}

export type ProgressMetric = "weight" | "oneRm" | "volume";

export interface PeriodComparison {
  /** Window length used for both current and previous (Todo → 30). */
  windowDays: number;
  currentStats: ProgressStats;
  previousStats: ProgressStats;
  weightDelta: number | null;
  oneRmDelta: number | null;
  volumeDelta: number | null;
}

function getDataForLocalWindow(
  data: ExerciseProgressDataPoint[],
  startDate: Date,
  endDate: Date
): ExerciseProgressDataPoint[] {
  return data.filter((point) => {
    const date = startOfLocalDay(
      new Date(`${toLocalDateKey(point.date)}T00:00:00`)
    );
    return date >= startDate && date <= endDate;
  });
}

/**
 * Compare the selected period with the immediately previous window of equal length.
 * Period `0` (Todo) uses the last 30 days vs the 30 days before that.
 */
export function compareWithPreviousPeriod(
  data: ExerciseProgressDataPoint[],
  period: ExerciseAnalysisPeriod,
  now: Date = new Date()
): PeriodComparison {
  const windowDays = period === 0 ? 30 : period;
  const today = startOfLocalDay(now);

  const currentStart = new Date(today);
  currentStart.setDate(currentStart.getDate() - (windowDays - 1));

  const previousEnd = new Date(currentStart);
  previousEnd.setDate(previousEnd.getDate() - 1);

  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - (windowDays - 1));

  const currentWindow = getDataForLocalWindow(data, currentStart, today);
  const previousWindow = getDataForLocalWindow(
    data,
    previousStart,
    previousEnd
  );

  const currentStats = calculateProgressStats(currentWindow);
  const previousStats = calculateProgressStats(previousWindow);

  return {
    windowDays,
    currentStats,
    previousStats,
    weightDelta: percentDelta(
      currentStats.bestWeight,
      previousStats.bestWeight
    ),
    oneRmDelta: percentDelta(currentStats.best1RM, previousStats.best1RM),
    volumeDelta: percentDelta(
      currentStats.totalVolume,
      previousStats.totalVolume
    ),
  };
}

export function metricDeltaFromComparison(
  comparison: PeriodComparison,
  metric: ProgressMetric
): number | null {
  switch (metric) {
    case "oneRm":
      return comparison.oneRmDelta;
    case "volume":
      return comparison.volumeDelta;
    case "weight":
    default:
      return comparison.weightDelta;
  }
}
