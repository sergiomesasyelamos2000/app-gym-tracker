import type {
  ExerciseAnalysisPeriod,
  PeriodComparison,
  ProgressMetric,
  ProgressStats,
} from "../../../utils/statsHelpers";
import { metricDeltaFromComparison } from "../../../utils/statsHelpers";

export type { ProgressMetric };

export function formatKg(value: number): string {
  if (!Number.isFinite(value)) return "0 kg";
  const rounded = Math.round(value * 10) / 10;
  const hasDecimal = Math.abs(rounded % 1) > 1e-9;
  return `${rounded.toLocaleString("es-ES", {
    minimumFractionDigits: hasDecimal ? 1 : 0,
    maximumFractionDigits: hasDecimal ? 1 : 0,
  })} kg`;
}

export function formatSignedPercent(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const abs = Math.abs(rounded).toLocaleString("es-ES", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  if (rounded > 0) return `+${abs} %`;
  if (rounded < 0) return `-${abs} %`;
  return `0,0 %`;
}

export function heroInsight(stats: ProgressStats | null): string {
  if (!stats || stats.trend === "no-data" || stats.totalSessions < 6) {
    return "Aún hay pocas sesiones para ver si subes de peso.";
  }
  if (stats.trend === "up") {
    return "Vas subiendo de peso en este periodo.";
  }
  if (stats.trend === "down") {
    return "Has bajado de peso en este periodo.";
  }
  return "Tu peso se mantiene parecido en este periodo.";
}

export function comparisonCaption(
  period: ExerciseAnalysisPeriod,
  delta: number | null
): string {
  const prefix =
    period === 0 ? "vs los 30 días anteriores" : "vs periodo anterior";
  if (delta == null) {
    return `${prefix}: sin datos para comparar`;
  }
  return `${prefix}: ${formatSignedPercent(delta)}`;
}

export function oneRmNote(): string {
  return "Es una estimación del máximo que podrías levantar una sola vez, calculada con tus series completadas.";
}

export function pointCaption(
  dateLabel: string,
  valueLabel: string,
  singleSession: boolean
): string {
  if (singleSession) {
    return `Una sesión: ${dateLabel} · ${valueLabel}`;
  }
  return `${dateLabel} · ${valueLabel}`;
}

export function metricValueLabel(
  metric: ProgressMetric,
  stats: ProgressStats
): string {
  switch (metric) {
    case "oneRm":
      return formatKg(stats.best1RM);
    case "volume":
      return formatKg(stats.totalVolume);
    case "weight":
    default:
      return formatKg(stats.bestWeight);
  }
}

export function metricTileLabel(metric: ProgressMetric): string {
  switch (metric) {
    case "oneRm":
      return "1RM";
    case "volume":
      return "Volumen";
    case "weight":
    default:
      return "Mejor peso";
  }
}

export function segmentLabel(metric: ProgressMetric): string {
  switch (metric) {
    case "oneRm":
      return "1RM";
    case "volume":
      return "Volumen";
    case "weight":
    default:
      return "Peso";
  }
}

export type TeaserCopy = {
  line1: string;
  line2: string;
  disabled: boolean;
};

export function teaserCopy(
  allProgressDataLength: number,
  comparison: PeriodComparison
): TeaserCopy {
  if (allProgressDataLength === 0) {
    return {
      line1: "Todavía no hay sesiones de este ejercicio.",
      line2: "Cuando lo completes, verás si subes de peso.",
      disabled: true,
    };
  }

  if (comparison.currentStats.totalSessions === 0) {
    return {
      line1: "No hay sesiones en los últimos 30 días.",
      line2: "Toca para ver otros periodos.",
      disabled: false,
    };
  }

  const delta = metricDeltaFromComparison(comparison, "weight");
  const deltaText =
    delta == null
      ? "sin datos para comparar"
      : `${formatSignedPercent(delta)} vs los 30 días anteriores`;

  return {
    line1: heroInsight(comparison.currentStats),
    line2: `Mejor peso: ${formatKg(comparison.currentStats.bestWeight)} · ${deltaText}`,
    disabled: false,
  };
}

export const EMPTY_PERIOD_COPY = {
  title: "Sin sesiones en este periodo.",
  body: "Prueba con otro rango o mira todo el historial.",
  action: "Ver todo",
};

export const EMPTY_EXERCISE_COPY = {
  title: "Sin sesiones de este ejercicio.",
  body: "Cuando lo completes en un entrenamiento, aquí verás peso, fuerza estimada y volumen.",
};

export const UNAVAILABLE_COPY = {
  title: "No se pudieron cargar tus entrenamientos.",
  body: "Revisa la conexión e inténtalo de nuevo.",
  action: "Reintentar",
};

export const STALE_REFRESH_COPY =
  "No se pudo actualizar. Sigues viendo los datos guardados.";
