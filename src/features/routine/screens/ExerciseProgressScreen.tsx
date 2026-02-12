import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  BarChart3,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react-native";
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
import { useTheme } from "../../../contexts/ThemeContext";
import { AppTheme } from "../../../types";
import {
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
      // Convertir RoutineSessionEntity[] a RoutineSession[]
      const convertedSessions: RoutineSession[] = allSessions.map(session => ({
        ...session,
        createdAt: session.createdAt instanceof Date
          ? session.createdAt.toISOString()
          : session.createdAt
      }));
      setSessions(convertedSessions);
    } catch (error) {
      console.error("Error loading sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  // Procesar datos según el período seleccionado
  const progressData = React.useMemo(() => {
    const rawData = getExerciseProgressData(exercise.id, sessions);
    const aggregated = aggregateByDate(rawData);
    const filtered = filterByPeriod(aggregated, selectedPeriod);
    return filtered;
  }, [exercise.id, sessions, selectedPeriod]);

  // Calcular estadísticas
  useEffect(() => {
    if (progressData.length > 0) {
      setStats(calculateProgressStats(progressData));
    } else {
      setStats(null);
    }
  }, [progressData]);

  // Preparar datos para las gráficas
  const chartData = React.useMemo(() => {
    if (progressData.length === 0) {
      return null;
    }

    const labels = progressData.map((point) => {
      const date = new Date(point.date);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    });

    const maxWeights = progressData.map((point) => point.maxWeight);
    const estimated1RMs = progressData.map((point) => point.estimated1RM);
    const volumes = progressData.map((point) => point.totalVolume / 1000); // Convertir a toneladas

    return {
      labels,
      maxWeights,
      estimated1RMs,
      volumes,
    };
  }, [progressData]);

  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      {([7, 30, 90, 0] as Period[]).map((period) => (
        <TouchableOpacity
          key={period}
          style={[
            styles.periodButton,
            selectedPeriod === period && styles.periodButtonActive,
          ]}
          onPress={() => setSelectedPeriod(period)}
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
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <BarChart3 size={64} color={theme.textSecondary} />
          <Text style={styles.emptyTitle}>Sin Datos de Progreso</Text>
          <Text style={styles.emptyText}>
            Completa entrenamientos con este ejercicio para ver tu progreso
            aquí.
          </Text>
        </View>
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

// Utilidad para convertir hex a rgb
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "0, 0, 0";
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(
    result[3],
    16
  )}`;
}

const createStyles = (theme: AppTheme) =>
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
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 40,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.text,
      marginTop: 20,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: "center",
      lineHeight: 24,
    },
    periodSelector: {
      flexDirection: "row",
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 4,
      marginBottom: 20,
    },
    periodButton: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
      alignItems: "center",
    },
    periodButtonActive: {
      backgroundColor: theme.primary,
    },
    periodButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.textSecondary,
    },
    periodButtonTextActive: {
      color: "#ffffff",
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
