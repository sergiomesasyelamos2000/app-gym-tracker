import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  BarChart3,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import {
  ExerciseProgressDataPoint,
  ProgressStats,
  RoutineSession,
  aggregateByDate,
  calculateProgressStats,
  filterByPeriod,
  getExerciseProgressData,
} from "../../../utils/statsHelpers";
import { findAllRoutineSessions } from "../services/routineService";
import { WorkoutStackParamList } from "./WorkoutStack";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type Props = NativeStackScreenProps<WorkoutStackParamList, "ExerciseProgress">;

type Period = 7 | 30 | 90 | 0;

const PERIOD_LABELS: Record<Period, string> = {
  7: "7 días",
  30: "30 días",
  90: "90 días",
  0: "Todo",
};

const CHART_LABEL_LIMIT = 6;

const startOfLocalDay = (date: Date): Date => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

const formatRangeDate = (dateText: string): string => {
  const date = new Date(dateText);
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}/${date.getFullYear()}`;
};

const formatPercent = (value: number): string =>
  `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;

const calculateDeltaPercent = (current: number, previous: number): number | null => {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
};

const getDataForWindow = (
  data: ExerciseProgressDataPoint[],
  startDate: Date,
  endDate: Date
): ExerciseProgressDataPoint[] => {
  return data.filter((point) => {
    const date = startOfLocalDay(new Date(point.date));
    return date >= startDate && date <= endDate;
  });
};

export default function ExerciseProgressScreen({ route, navigation }: Props) {
  const { exercise } = route.params;
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(30);
  const [sessions, setSessions] = useState<RoutineSession[]>([]);
  const [stats, setStats] = useState<ProgressStats | null>(null);

  useEffect(() => {
    navigation.setOptions({
      title: exercise.name || "Progreso del Ejercicio",
    });
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const allSessions = await findAllRoutineSessions();
      const convertedSessions: RoutineSession[] = allSessions.map((session) => ({
        ...session,
        createdAt:
          session.createdAt instanceof Date
            ? session.createdAt.toISOString()
            : session.createdAt,
      }));
      setSessions(convertedSessions);
    } catch (error) {
      console.error("Error loading sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const allProgressData = React.useMemo(() => {
    const rawData = getExerciseProgressData(exercise.id, sessions);
    return aggregateByDate(rawData);
  }, [exercise.id, sessions]);

  const progressData = React.useMemo(
    () => filterByPeriod(allProgressData, selectedPeriod),
    [allProgressData, selectedPeriod]
  );

  const periodRangeLabel = React.useMemo(() => {
    if (progressData.length === 0) return null;
    const first = progressData[0];
    const last = progressData[progressData.length - 1];
    return `Mostrando del ${formatRangeDate(first.date)} al ${formatRangeDate(
      last.date
    )}`;
  }, [progressData]);

  const deltaData = React.useMemo(() => {
    const daysForDelta = selectedPeriod === 0 ? 30 : selectedPeriod;
    const today = startOfLocalDay(new Date());

    const currentStart = new Date(today);
    currentStart.setDate(currentStart.getDate() - (daysForDelta - 1));

    const previousEnd = new Date(currentStart);
    previousEnd.setDate(previousEnd.getDate() - 1);

    const previousStart = new Date(previousEnd);
    previousStart.setDate(previousStart.getDate() - (daysForDelta - 1));

    const currentWindowData = getDataForWindow(allProgressData, currentStart, today);
    const previousWindowData = getDataForWindow(
      allProgressData,
      previousStart,
      previousEnd
    );

    if (currentWindowData.length === 0 || previousWindowData.length === 0) {
      return null;
    }

    const currentStats = calculateProgressStats(currentWindowData);
    const previousStats = calculateProgressStats(previousWindowData);

    return {
      comparisonLabel:
        selectedPeriod === 0
          ? "Últimos 30 días vs 30 días previos"
          : `Últimos ${selectedPeriod} días vs periodo anterior`,
      weightDelta: calculateDeltaPercent(
        currentStats.bestWeight,
        previousStats.bestWeight
      ),
      volumeDelta: calculateDeltaPercent(
        currentStats.totalVolume,
        previousStats.totalVolume
      ),
    };
  }, [allProgressData, selectedPeriod]);

  useEffect(() => {
    if (progressData.length > 0) {
      setStats(calculateProgressStats(progressData));
    } else {
      setStats(null);
    }
  }, [progressData]);

  const chartData = React.useMemo(() => {
    if (progressData.length === 0) {
      return null;
    }

    const rawLabels = progressData.map((point) => {
      const date = new Date(point.date);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    });

    const labelStep = Math.max(1, Math.ceil(rawLabels.length / CHART_LABEL_LIMIT));
    const labels = rawLabels.map((label, index) =>
      index % labelStep === 0 || index === rawLabels.length - 1 ? label : ""
    );

    const maxWeights = progressData.map((point) => point.maxWeight);
    const estimated1RMs = progressData.map((point) => point.estimated1RM);
    const volumes = progressData.map((point) => point.totalVolume / 1000);

    return {
      labels,
      maxWeights,
      estimated1RMs,
      volumes,
    };
  }, [progressData]);

  const renderPeriodSelector = () => (
    <View style={styles.periodSelectorContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.periodSelector}
      >
        {([7, 30, 90, 0] as Period[]).map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              selectedPeriod === period && styles.periodButtonActive,
            ]}
            onPress={() => {
              void Haptics.selectionAsync();
              setSelectedPeriod(period);
            }}
          >
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === period && styles.periodButtonTextActive,
              ]}
            >
              {PERIOD_LABELS[period]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderStatsCard = (
    title: string,
    value: string | number,
    subtitle?: string,
    icon?: React.ReactNode
  ) => (
    <View style={styles.statsCard}>
      <View style={styles.statsCardHeader}>
        {icon && <View style={styles.statsCardIcon}>{icon}</View>}
        <Text style={styles.statsCardTitle}>{title}</Text>
      </View>
      <Text style={styles.statsCardValue}>{value}</Text>
      {subtitle && <Text style={styles.statsCardSubtitle}>{subtitle}</Text>}
    </View>
  );

  const renderTrendIcon = () => {
    if (!stats) return null;

    switch (stats.trend) {
      case "up":
        return <TrendingUp size={20} color="#4ade80" />;
      case "down":
        return <TrendingDown size={20} color="#f87171" />;
      case "stable":
        return <Minus size={20} color={theme.textSecondary} />;
      default:
        return null;
    }
  };

  const renderDeltaValue = (value: number | null) => {
    if (value === null) return "N/D";
    return formatPercent(value);
  };

  const renderDeltaColor = (value: number | null) => {
    if (value === null) return theme.text;
    if (value > 0) return "#16a34a";
    if (value < 0) return "#dc2626";
    return theme.text;
  };

  const renderStatsOverview = () => {
    if (!stats) return null;

    return (
      <View style={styles.statsOverview}>
        <View style={styles.statsRow}>
          {renderStatsCard(
            "Mejor Peso",
            `${stats.bestWeight} kg`,
            undefined,
            renderTrendIcon()
          )}
          {renderStatsCard("1RM Estimado", `${stats.best1RM} kg`)}
        </View>
        <View style={styles.statsRow}>
          {renderStatsCard("Peso Promedio", `${stats.averageWeight} kg`)}
          {renderStatsCard(
            "Volumen Total",
            `${(stats.totalVolume / 1000).toFixed(1)} t`,
            `${stats.totalSessions} sesiones`
          )}
        </View>

        {deltaData && (
          <View style={styles.deltaCard}>
            <Text style={styles.deltaTitle}>Comparativa</Text>
            <Text style={styles.deltaSubtitle}>{deltaData.comparisonLabel}</Text>

            <View style={styles.deltaRow}>
              <Text style={styles.deltaLabel}>Peso máximo</Text>
              <Text
                style={[
                  styles.deltaValue,
                  { color: renderDeltaColor(deltaData.weightDelta) },
                ]}
              >
                {renderDeltaValue(deltaData.weightDelta)}
              </Text>
            </View>

            <View style={styles.deltaRow}>
              <Text style={styles.deltaLabel}>Volumen total</Text>
              <Text
                style={[
                  styles.deltaValue,
                  { color: renderDeltaColor(deltaData.volumeDelta) },
                ]}
              >
                {renderDeltaValue(deltaData.volumeDelta)}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderChart = (
    title: string,
    data: number[],
    labels: string[],
    color: string,
    suffix: string = ""
  ) => {
    const chartWidth = SCREEN_WIDTH - 40;

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{title}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chartScrollView}
        >
          <LineChart
            data={{
              labels,
              datasets: [
                {
                  data,
                  color: () => color,
                  strokeWidth: 3,
                },
              ],
            }}
            width={Math.max(chartWidth, labels.length * 60)}
            height={220}
            chartConfig={{
              backgroundColor: theme.card,
              backgroundGradientFrom: theme.card,
              backgroundGradientTo: theme.card,
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(${hexToRgb(color)}, ${opacity})`,
              labelColor: () => theme.textSecondary,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: "4",
                strokeWidth: "2",
                stroke: color,
              },
              propsForBackgroundLines: {
                strokeDasharray: "",
                stroke: theme.border,
                strokeWidth: 1,
              },
            }}
            bezier
            style={styles.chart}
            formatYLabel={(value) => `${parseFloat(value).toFixed(1)}${suffix}`}
          />
        </ScrollView>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Cargando datos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (progressData.length === 0) {
    const hasHistoricalData = allProgressData.length > 0;

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderPeriodSelector()}

          <View style={styles.emptyContainer}>
            <BarChart3 size={64} color={theme.textSecondary} />
            <Text style={styles.emptyTitle}>
              {hasHistoricalData
                ? "Sin datos en este período"
                : "Sin Datos de Progreso"}
            </Text>
            <Text style={styles.emptyText}>
              {hasHistoricalData
                ? "No hay entrenamientos de este ejercicio en el rango seleccionado."
                : "Completa entrenamientos con este ejercicio para ver tu progreso aquí."}
            </Text>

            {hasHistoricalData && selectedPeriod !== 0 && (
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => setSelectedPeriod(0)}
              >
                <Text style={styles.viewAllButtonText}>Ver todo</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderPeriodSelector()}
        {periodRangeLabel && <Text style={styles.rangeText}>{periodRangeLabel}</Text>}
        {renderStatsOverview()}

        {chartData && (
          <>
            {renderChart(
              "Peso Máximo (kg)",
              chartData.maxWeights,
              chartData.labels,
              theme.primary,
              " kg"
            )}

            {renderChart(
              "1RM Estimado (kg)",
              chartData.estimated1RMs,
              chartData.labels,
              "#f59e0b",
              " kg"
            )}

            {renderChart(
              "Volumen Total (toneladas)",
              chartData.volumes,
              chartData.labels,
              "#8b5cf6",
              " t"
            )}
          </>
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>💡 Sobre el 1RM</Text>
          <Text style={styles.infoText}>
            El 1RM (Una Repetición Máxima) es una estimación del peso máximo que
            podrías levantar en una sola repetición, calculado a partir de tus
            series completadas.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "0, 0, 0";
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(
    result[3],
    16
  )}`;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 40,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      marginTop: 16,
      color: theme.textSecondary,
      fontSize: 16,
    },
    emptyContainer: {
      alignItems: "center",
      paddingVertical: 48,
      paddingHorizontal: 24,
      backgroundColor: theme.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.text,
      marginTop: 20,
      marginBottom: 8,
      textAlign: "center",
    },
    emptyText: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: "center",
      lineHeight: 24,
    },
    viewAllButton: {
      marginTop: 16,
      backgroundColor: theme.primary,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    viewAllButtonText: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "700",
    },
    periodSelectorContainer: {
      marginBottom: 12,
    },
    periodSelector: {
      flexDirection: "row",
      gap: 8,
      paddingRight: 4,
    },
    periodButton: {
      minWidth: 84,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 999,
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
    },
    periodButtonActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    periodButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.textSecondary,
    },
    periodButtonTextActive: {
      color: "#ffffff",
    },
    rangeText: {
      marginBottom: 14,
      color: theme.textSecondary,
      fontSize: 13,
      fontWeight: "500",
    },
    statsOverview: {
      marginBottom: 20,
    },
    statsRow: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 12,
    },
    statsCard: {
      flex: 1,
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    statsCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    statsCardIcon: {
      marginRight: 6,
    },
    statsCardTitle: {
      fontSize: 12,
      color: theme.textSecondary,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    statsCardValue: {
      fontSize: 24,
      fontWeight: "bold",
      color: theme.text,
      marginBottom: 2,
    },
    statsCardSubtitle: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    deltaCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.border,
      marginTop: 4,
    },
    deltaTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.text,
      marginBottom: 2,
    },
    deltaSubtitle: {
      fontSize: 12,
      color: theme.textSecondary,
      marginBottom: 10,
    },
    deltaRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 6,
    },
    deltaLabel: {
      color: theme.textSecondary,
      fontSize: 13,
      fontWeight: "600",
    },
    deltaValue: {
      fontSize: 13,
      fontWeight: "700",
    },
    chartContainer: {
      marginBottom: 24,
    },
    chartTitle: {
      fontSize: 16,
      fontWeight: "bold",
      color: theme.text,
      marginBottom: 12,
    },
    chartScrollView: {
      marginHorizontal: -20,
      paddingHorizontal: 20,
    },
    chart: {
      marginVertical: 8,
      borderRadius: 16,
    },
    infoBox: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
      marginTop: 8,
    },
    infoTitle: {
      fontSize: 14,
      fontWeight: "bold",
      color: theme.text,
      marginBottom: 8,
    },
    infoText: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 20,
    },
  });
