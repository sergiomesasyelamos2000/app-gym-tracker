import { RoutineSessionEntity } from "@sergiomesasyelamos2000/shared";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  ImageStyle,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import Icon from "react-native-vector-icons/MaterialIcons";
import { WebView } from "react-native-webview";
import CachedExerciseImage from "../../../components/CachedExerciseImage";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import type { ExerciseRequestDto } from "@sergiomesasyelamos2000/shared";
import { ExerciseSet, SessionData, SessionExercise } from "../../../types";
import {
  ExerciseProgressDataPoint,
  RoutineSession,
  aggregateByDate,
  calculateProgressStats,
  filterByPeriod,
  getExerciseProgressData,
} from "../../../utils/statsHelpers";
import { findAllRoutineSessions } from "../services/routineService";
import { WorkoutStackParamList } from "./WorkoutStack";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IS_SMALL_DEVICE = SCREEN_WIDTH < 375;
const IS_VERY_SMALL_DEVICE = SCREEN_WIDTH < 350;

type Props = NativeStackScreenProps<WorkoutStackParamList, "ExerciseDetail">;
type AnalysisPeriod = 7 | 30 | 90 | 0;

const ANALYSIS_PERIODS: AnalysisPeriod[] = [7, 30, 90, 0];

const ANALYSIS_PERIOD_LABELS: Record<AnalysisPeriod, string> = {
  7: "7d",
  30: "30d",
  90: "90d",
  0: "Todo",
};

// ============================================================================
// TIPOS Y INTERFACES
// ============================================================================
interface ExerciseHistoryItem {
  id: string;
  date: string;
  routineName: string;
  routineId: string;
  sets: ExerciseSet[];
  completedSets: number;
  totalWeight: number;
  totalReps: number;
  volume: number;
  maxWeight: number;
  totalTime: number;
  sessionData: SessionData;
}

interface ExerciseImageProps {
  exercise: ExerciseRequestDto & {
    giftUrl?: string;
    gifUrl?: string;
    imageUrl?: string;
    videoUrl?: string;
  };
  style: ImageStyle;
}

// ============================================================================
// UTILIDADES DE IMAGEN
// ============================================================================
const ExerciseImage = ({ exercise, style }: ExerciseImageProps) => {
  const webViewRef = React.useRef<WebView>(null);
  const videoUrl = exercise.videoUrl?.trim();
  const flattenedStyle = StyleSheet.flatten(style);
  const gifUrl = exercise.giftUrl || exercise.gifUrl;
  const staticFallbackUrl =
    exercise.imageUrl && exercise.imageUrl !== gifUrl ? exercise.imageUrl : "";
  const canPauseGif = Boolean(gifUrl && staticFallbackUrl);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    setIsPaused(false);
  }, [videoUrl, gifUrl, staticFallbackUrl]);

  if (videoUrl) {
    const videoContainerWidth =
      typeof flattenedStyle?.width === "number"
        ? flattenedStyle.width * 1.2
        : flattenedStyle?.width;

    const videoHtml = `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <style>
      html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #000; overflow: hidden; }
      video { width: 100%; height: 100%; object-fit: cover; }
    </style>
  </head>
  <body>
    <video id="exerciseVideo" src="${videoUrl}" playsinline webkit-playsinline muted loop autoplay></video>
    <script>
      const video = document.getElementById('exerciseVideo');
      function sendPausedState() {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ paused: video.paused }));
        }
      }
      window.__togglePlayback = function () {
        if (video.paused) { video.play(); } else { video.pause(); }
        sendPausedState();
      };
      video.addEventListener('play', sendPausedState);
      video.addEventListener('pause', sendPausedState);
      sendPausedState();
    </script>
  </body>
</html>`;

    return (
      <View
        style={[
          style,
          {
            width: videoContainerWidth,
            position: "relative",
            overflow: "hidden",
          },
        ]}
      >
        <WebView
          ref={webViewRef}
          source={{ html: videoHtml }}
          style={StyleSheet.absoluteFillObject}
          originWhitelist={["*"]}
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          androidLayerType="hardware"
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
        onMessage={(event) => {
            try {
              const payload = JSON.parse(event.nativeEvent.data);
              if (typeof payload?.paused === "boolean") {
                setIsPaused(payload.paused);
              }
            } catch {
              // no-op
            }
          }}
        />
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            webViewRef.current?.injectJavaScript(
              "window.__togglePlayback && window.__togglePlayback(); true;"
            );
          }}
          style={{
            position: "absolute",
            right: 8,
            bottom: 8,
            width: 30,
            height: 30,
            borderRadius: 15,
            backgroundColor: "rgba(0,0,0,0.55)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon
            name={isPaused ? "play-arrow" : "pause"}
            size={RFValue(14)}
            color="#fff"
          />
        </TouchableOpacity>
      </View>
    );
  }

  // Use giftUrl/gifUrl if available (animated GIF)
  if (gifUrl) {
    return (
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={() => {
          if (!canPauseGif) return;
          setIsPaused((prev) => !prev);
        }}
        disabled={!canPauseGif}
      >
        {isPaused && staticFallbackUrl ? (
          <CachedExerciseImage imageUrl={staticFallbackUrl} style={style} />
        ) : (
          <Image source={{ uri: gifUrl }} style={style} resizeMode="cover" />
        )}
        {canPauseGif && (
          <View
            style={{
              position: "absolute",
              right: 8,
              bottom: 8,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 999,
              backgroundColor: "rgba(0,0,0,0.55)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon
              name={isPaused ? "play-arrow" : "pause"}
              size={RFValue(12)}
              color="#fff"
            />
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // Use cached image for regular exercise images
  return <CachedExerciseImage imageUrl={exercise.imageUrl} style={style} />;
};

// ============================================================================
// PROCESAMIENTO DE DATOS
// ============================================================================
type RoutineSessionExercise = RoutineSessionEntity["exercises"][number];

const processExerciseFromSession = (
  session: RoutineSessionEntity,
  exerciseId: string
): ExerciseHistoryItem | null => {
  const exerciseEntry: RoutineSessionExercise | undefined =
    session.exercises?.find((e) => e.exerciseId === exerciseId);

  if (!exerciseEntry) return null;

  const sets = exerciseEntry.sets || [];
  const completedSets = sets.filter((s) => s.completed).length;
  const totalWeight = sets.reduce((sum, s) => sum + (s.weight || 0), 0);
  const totalReps = sets.reduce((sum, s) => sum + (s.reps || 0), 0);
  const maxWeight = sets
    .filter((s) => s.completed && s.weight > 0)
    .reduce((max, s) => Math.max(max, s.weight), 0);

  return {
    id: session.id,
    date: session.createdAt?.toString() || new Date().toString(),
    routineName: (session as any).routine?.title || "Entrenamiento sin título",
    routineId: session.routineId ?? "",
    sets: sets as ExerciseSet[],
    completedSets,
    totalWeight,
    totalReps,
    volume: totalWeight * totalReps,
    maxWeight,
    totalTime: session.totalTime || 0,
    sessionData: session as unknown as SessionData,
  };
};

// Formatear números grandes
const formatNumber = (num: number) => {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
};

const startOfDay = (date: Date) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

const formatDelta = (value: number | null, unit = "%") => {
  if (value === null || Number.isNaN(value)) return "Sin base de comparación";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}${unit}`;
};

const getDelta = (current: number, previous: number): number | null => {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
};

const getSeriesPerWeek = (data: ExerciseProgressDataPoint[]): number => {
  if (data.length === 0) return 0;
  if (data.length === 1) return 1;

  const first = startOfDay(new Date(data[0].date));
  const last = startOfDay(new Date(data[data.length - 1].date));
  const days = Math.max(
    1,
    Math.floor((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );
  return data.length / (days / 7);
};

const getCurrentStreak = (data: ExerciseProgressDataPoint[]): number => {
  if (data.length === 0) return 0;

  const sorted = [...data].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  let streak = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = startOfDay(new Date(sorted[i - 1].date));
    const current = startOfDay(new Date(sorted[i].date));
    const diffDays = Math.round(
      (prev.getTime() - current.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 1) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
};

const getWindowData = (
  data: ExerciseProgressDataPoint[],
  start: Date,
  end: Date
) =>
  data.filter((point) => {
    const date = startOfDay(new Date(point.date));
    return date >= start && date <= end;
  });

// ============================================================================
// COMPONENTES
// ============================================================================
const LoadingView = ({ theme }: { theme: Theme }) => {
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>Cargando histórico...</Text>
      </View>
    </SafeAreaView>
  );
};

const EmptyStateView = ({ theme }: { theme: Theme }) => {
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateEmoji}>📊</Text>
      <Text style={styles.emptyStateTitle}>No hay datos históricos</Text>
      <Text style={styles.emptyStateText}>
        Realiza este ejercicio en alguna rutina para comenzar a trackear tu
        progreso.
      </Text>
    </View>
  );
};

interface HeaderProps {
  exercise: ExerciseRequestDto;
  fadeAnim: Animated.Value;
  theme: Theme;
}

const Header = ({ exercise, fadeAnim, theme }: HeaderProps) => {
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  return (
    <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
      <ExerciseImage exercise={exercise} style={styles.exerciseImage} />
      <View style={styles.exerciseInfo}>
        <Text style={styles.exerciseName} numberOfLines={2}>
          {exercise.name}
        </Text>
        {exercise.muscularGroup && (
          <View style={styles.muscleGroupTag}>
            <Text style={styles.muscleGroupText} numberOfLines={1}>
              {exercise.muscularGroup}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

interface QuickStatsProps {
  currentWeight: number;
  totalSessions: number;
  maxWeight: number;
  theme: Theme;
}

const QuickStats = ({
  currentWeight,
  totalSessions,
  maxWeight,
  theme,
}: QuickStatsProps) => {
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.quickStatsSection}>
      <View style={styles.quickStatsGrid}>
        <View style={styles.quickStat}>
          <View style={styles.quickStatIconContainer}>
            <Text style={styles.quickStatIcon}>⚖️</Text>
          </View>
          <Text style={styles.quickStatValue} numberOfLines={1}>
            {currentWeight > 0 ? `${currentWeight} kg` : "N/A"}
          </Text>
          <Text style={styles.quickStatLabel} numberOfLines={1}>
            Peso actual
          </Text>
        </View>
        <View style={styles.quickStatDivider} />
        <View style={styles.quickStat}>
          <View style={styles.quickStatIconContainer}>
            <Text style={styles.quickStatIcon}>📊</Text>
          </View>
          <Text style={styles.quickStatValue} numberOfLines={1}>
            {totalSessions}
          </Text>
          <Text style={styles.quickStatLabel} numberOfLines={1}>
            Sesiones
          </Text>
        </View>
        <View style={styles.quickStatDivider} />
        <View style={styles.quickStat}>
          <View style={styles.quickStatIconContainer}>
            <Text style={styles.quickStatIcon}>🏆</Text>
          </View>
          <Text style={styles.quickStatValue} numberOfLines={1}>
            {maxWeight} kg
          </Text>
          <Text style={styles.quickStatLabel} numberOfLines={1}>
            Récord
          </Text>
        </View>
      </View>
    </View>
  );
};

interface AnalysisMetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  actualLabel: string;
  averageLabel: string;
  comparisonLabel?: string;
  theme: Theme;
}

const AnalysisMetricCard = ({
  title,
  value,
  subtitle,
  actualLabel,
  averageLabel,
  comparisonLabel,
  theme,
}: AnalysisMetricCardProps) => {
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.analysisCard}>
      <Text style={styles.analysisCardTitle}>{title}</Text>
      <Text style={styles.analysisCardValue}>{value}</Text>
      <Text style={styles.analysisCardSubtitle}>{subtitle}</Text>
      <Text style={styles.analysisCardMeta}>{actualLabel}</Text>
      <Text style={styles.analysisCardMeta}>{averageLabel}</Text>
      {comparisonLabel ? (
        <Text style={styles.analysisCardDelta}>{comparisonLabel}</Text>
      ) : null}
    </View>
  );
};

interface ProgressSectionProps {
  theme: Theme;
  period: AnalysisPeriod;
  onChangePeriod: (period: AnalysisPeriod) => void;
  hasAnyData: boolean;
  hasPeriodData: boolean;
  currentData: ExerciseProgressDataPoint[];
  previousData: ExerciseProgressDataPoint[];
}

const ProgressSection = ({
  theme,
  period,
  onChangePeriod,
  hasAnyData,
  hasPeriodData,
  currentData,
  previousData,
}: ProgressSectionProps) => {
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  if (!hasAnyData) {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Análisis de Progreso</Text>
          <Text style={styles.sectionSubtitle}>
            Necesitas al menos 2 sesiones para ver tendencia y comparativas.
          </Text>
        </View>
      </View>
    );
  }

  const currentStats =
    currentData.length > 0 ? calculateProgressStats(currentData) : null;
  const previousStats =
    previousData.length > 0 ? calculateProgressStats(previousData) : null;

  const weightDelta =
    currentStats && previousStats
      ? getDelta(currentStats.bestWeight, previousStats.bestWeight)
      : null;
  const volumeDelta =
    currentStats && previousStats
      ? getDelta(currentStats.totalVolume, previousStats.totalVolume)
      : null;
  const oneRmDelta =
    currentStats && previousStats
      ? getDelta(currentStats.best1RM, previousStats.best1RM)
      : null;

  const consistency = getSeriesPerWeek(currentData);
  const streak = getCurrentStreak(currentData);

  const trendLabel =
    currentStats?.trend === "up"
      ? "Tendencia: subiendo"
      : currentStats?.trend === "down"
      ? "Tendencia: bajando"
      : "Tendencia: estable";

  const periodText =
    period === 0
      ? "Comparación: últimos 30 días vs 30 días previos"
      : `Comparación: últimos ${period} días vs periodo anterior`;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Análisis de Progreso</Text>
        <Text style={styles.sectionSubtitle}>
          Métricas consistentes con Gráficas
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.periodChips}
      >
        {ANALYSIS_PERIODS.map((item) => (
          <TouchableOpacity
            key={item}
            style={[
              styles.periodChip,
              item === period && styles.periodChipActive,
            ]}
            onPress={() => onChangePeriod(item)}
          >
            <Text
              style={[
                styles.periodChipText,
                item === period && styles.periodChipTextActive,
              ]}
            >
              {ANALYSIS_PERIOD_LABELS[item]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {!hasPeriodData ? (
        <View style={styles.analysisEmptyBox}>
          <Text style={styles.analysisEmptyTitle}>
            Sin datos en este período
          </Text>
          <Text style={styles.analysisEmptyText}>
            Prueba con otro rango o pulsa en Gráficas para ver el histórico
            completo.
          </Text>
          <TouchableOpacity
            style={styles.analysisEmptyAction}
            onPress={() => onChangePeriod(0)}
          >
            <Text style={styles.analysisEmptyActionText}>Ver todo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Text style={styles.analysisMetaText}>{periodText}</Text>
          <Text style={styles.analysisMetaText}>{trendLabel}</Text>
          <Text style={styles.analysisMetaText}>
            Consistencia: {consistency.toFixed(1)} sesiones/semana | Racha:{" "}
            {streak} días
          </Text>

          <View style={styles.analysisGrid}>
            <AnalysisMetricCard
              title="Peso máximo (kg)"
              value={`${currentStats?.bestWeight ?? 0} kg`}
              subtitle="Mejor marca del período"
              actualLabel={`Actual: ${
                currentData[currentData.length - 1]?.maxWeight ?? 0
              } kg`}
              averageLabel={`Promedio: ${currentStats?.averageWeight ?? 0} kg`}
              comparisonLabel={`Comparación: ${formatDelta(
                weightDelta
              )} vs período anterior`}
              theme={theme}
            />
            <AnalysisMetricCard
              title="1RM estimado (kg)"
              value={`${currentStats?.best1RM ?? 0} kg`}
              subtitle="Estimación de fuerza máxima"
              actualLabel={`Actual: ${
                Math.round(
                  (currentData[currentData.length - 1]?.estimated1RM ?? 0) * 10
                ) / 10
              } kg`}
              averageLabel={`Promedio: ${currentStats?.average1RM ?? 0} kg`}
              comparisonLabel={`Comparación: ${formatDelta(
                oneRmDelta
              )} vs período anterior`}
              theme={theme}
            />
            <AnalysisMetricCard
              title="Volumen total (kg)"
              value={`${Math.round(currentStats?.totalVolume ?? 0)} kg`}
              subtitle={`${
                currentStats?.totalSessions ?? 0
              } sesiones en el período`}
              actualLabel={`Actual: ${Math.round(
                currentData[currentData.length - 1]?.totalVolume ?? 0
              )} kg`}
              averageLabel={`Promedio: ${
                currentStats && currentStats.totalSessions > 0
                  ? Math.round(
                      currentStats.totalVolume / currentStats.totalSessions
                    )
                  : 0
              } kg/sesión`}
              comparisonLabel={`Comparación: ${formatDelta(
                volumeDelta
              )} vs período anterior`}
              theme={theme}
            />
          </View>
        </>
      )}
    </View>
  );
};

interface HistoryCardProps {
  item: ExerciseHistoryItem;
  fadeAnim: Animated.Value;
  onNavigateToRoutine: (routineId: string, routine: SessionData) => void;
  theme: Theme;
}

const HistoryCard = ({
  item,
  fadeAnim,
  onNavigateToRoutine,
  theme,
}: HistoryCardProps) => {
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const isPersonalBest =
    item.maxWeight ===
    Math.max(
      ...item.sessionData.exercises
        .filter(
          (e: SessionExercise) =>
            e.exerciseId === item.sessionData.exercises[0].id
        )
        .map((e: SessionExercise) =>
          Math.max(
            ...e.sets
              .filter((s: ExerciseSet) => s.completed)
              .map((s: ExerciseSet) => s.weight)
          )
        )
    );

  return (
    <Animated.View
      style={[
        styles.historyCard,
        isPersonalBest && styles.personalBestCard,
        {
          opacity: fadeAnim,
          transform: [
            {
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0],
              }),
            },
          ],
        },
      ]}
    >
      {isPersonalBest && (
        <View style={styles.personalBestBadge}>
          <Text style={styles.personalBestText}>🏆 Récord Personal</Text>
        </View>
      )}

      <View style={styles.historyHeader}>
        <View style={styles.historyInfo}>
          <View style={styles.dateContainer}>
            <Text style={styles.historyDateIcon}>📅</Text>
            <Text style={styles.historyDate} numberOfLines={1}>
              {new Date(item.date).toLocaleDateString("es-ES", {
                weekday: IS_SMALL_DEVICE ? "short" : "long",
                day: "numeric",
                month: IS_SMALL_DEVICE ? "short" : "long",
                year: "numeric",
              })}
            </Text>
          </View>
          <View style={styles.routineContainer}>
            <Text style={styles.routineName} numberOfLines={2}>
              {item.routineName}
            </Text>
          </View>
        </View>
        <View style={styles.weightBadge}>
          <Text style={styles.weightLabel}>MAX</Text>
          <Text style={styles.weightValue} numberOfLines={1}>
            {item.maxWeight} kg
          </Text>
        </View>
      </View>

      <View style={styles.historyStats}>
        <View style={styles.statItem}>
          <Text style={styles.statItemIcon}>✅</Text>
          <View style={styles.statItemContent}>
            <Text style={styles.statValue} numberOfLines={1}>
              {item.completedSets}
            </Text>
            <Text style={styles.statLabel} numberOfLines={1}>
              Series
            </Text>
          </View>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statItemIcon}>🔁</Text>
          <View style={styles.statItemContent}>
            <Text style={styles.statValue} numberOfLines={1}>
              {item.totalReps}
            </Text>
            <Text style={styles.statLabel} numberOfLines={1}>
              Reps
            </Text>
          </View>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statItemIcon}>💪</Text>
          <View style={styles.statItemContent}>
            <Text style={styles.statValue} numberOfLines={1}>
              {formatNumber(item.volume)}
            </Text>
            <Text style={styles.statLabel} numberOfLines={1}>
              Vol. kg
            </Text>
          </View>
        </View>
      </View>

      {item.sets?.length > 0 && (
        <View style={styles.setsContainer}>
          <Text style={styles.setsTitle}>
            Series realizadas ({item.sets.length}):
          </Text>
          <View style={styles.setsList}>
            {item.sets.map((set: ExerciseSet, i: number) => (
              <View
                key={i}
                style={[styles.setItem, set.completed && styles.completedSet]}
              >
                <View style={styles.setNumber}>
                  <Text style={styles.setNumberText}>{i + 1}</Text>
                </View>
                <Text style={styles.setText} numberOfLines={1}>
                  {set.weight} kg × {set.reps} reps
                </Text>
                <Text style={styles.setStatus}>
                  {set.completed ? "✅" : "❌"}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </Animated.View>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export const ExerciseDetailScreen = ({ route, navigation }: Props) => {
  const { exercise } = route.params;
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  // Estado
  const [fadeAnim] = useState(new Animated.Value(0));
  const [history, setHistory] = useState<ExerciseHistoryItem[]>([]);
  const [allSessions, setAllSessions] = useState<RoutineSessionEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analysisPeriod, setAnalysisPeriod] = useState<AnalysisPeriod>(30);

  // Fetch de datos
  const fetchExerciseHistory = useCallback(async () => {
    try {
      setLoading(true);
      const sessionsData = await findAllRoutineSessions();
      setAllSessions(sessionsData as RoutineSessionEntity[]);

      const exerciseHistory = sessionsData
        .map(
          (
            session: RoutineSessionEntity // ✅ Cambiar tipo aquí
          ) => processExerciseFromSession(session, exercise.id)
        )
        .filter((item): item is ExerciseHistoryItem => item !== null)
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

      setHistory(exerciseHistory);
    } catch (error) {
      console.error("Error fetching exercise history:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [exercise.id]);

  useEffect(() => {
    fetchExerciseHistory();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fetchExerciseHistory]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchExerciseHistory();
  }, [fetchExerciseHistory]);

  // Cálculos derivados
  const stats = useMemo(
    () => ({
      totalSessions: history.length,
      maxWeight:
        history.length > 0 ? Math.max(...history.map((i) => i.maxWeight)) : 0,
      currentWeight: history.length > 0 ? history[0].maxWeight : 0,
      totalVolume: history.reduce((s, i) => s + i.volume, 0),
    }),
    [history]
  );

  const normalizedSessions = useMemo<RoutineSession[]>(
    () =>
      allSessions.map((session) => ({
        ...session,
        createdAt:
          session.createdAt instanceof Date
            ? session.createdAt.toISOString()
            : String(session.createdAt),
      })),
    [allSessions]
  );

  const allProgressData = useMemo(() => {
    const rawData = getExerciseProgressData(exercise.id, normalizedSessions);
    return aggregateByDate(rawData);
  }, [exercise.id, normalizedSessions]);

  const currentPeriodData = useMemo(
    () => filterByPeriod(allProgressData, analysisPeriod),
    [allProgressData, analysisPeriod]
  );

  const previousPeriodData = useMemo(() => {
    const days = analysisPeriod === 0 ? 30 : analysisPeriod;
    const today = startOfDay(new Date());
    const currentStart = new Date(today);
    currentStart.setDate(currentStart.getDate() - (days - 1));

    const previousEnd = new Date(currentStart);
    previousEnd.setDate(previousEnd.getDate() - 1);

    const previousStart = new Date(previousEnd);
    previousStart.setDate(previousStart.getDate() - (days - 1));

    return getWindowData(allProgressData, previousStart, previousEnd);
  }, [allProgressData, analysisPeriod]);

  // Navegación
  const handleNavigateToRoutine = useCallback(
    (routineId: string) => {
      // ✅ Solo pasar routineId
      navigation.navigate("RoutineDetail", { routineId }); // routine es opcional
    },
    [navigation]
  );

  // Render de item del histórico
  const renderHistoryItem = ({ item }: { item: ExerciseHistoryItem }) => (
    <HistoryCard
      item={item}
      fadeAnim={fadeAnim}
      onNavigateToRoutine={handleNavigateToRoutine}
      theme={theme}
    />
  );

  if (loading) {
    return <LoadingView theme={theme} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Header exercise={exercise} fadeAnim={fadeAnim} theme={theme} />

        <QuickStats
          currentWeight={stats.currentWeight}
          totalSessions={stats.totalSessions}
          maxWeight={stats.maxWeight}
          theme={theme}
        />

        {/* Botón Ver Progreso */}
        <View style={styles.progressButtonContainer}>
          <TouchableOpacity
            style={styles.progressButton}
            onPress={() =>
              navigation.navigate("ExerciseProgress", { exercise })
            }
            activeOpacity={0.7}
          >
            <View style={styles.progressButtonContent}>
              <View style={styles.progressButtonLeft}>
                <View style={styles.progressButtonIconContainer}>
                  <Text style={styles.progressButtonIcon}>📊</Text>
                </View>
                <View style={styles.progressButtonTextContainer}>
                  <Text style={styles.progressButtonTitle}>
                    Gráficas de Progreso
                  </Text>
                  <Text style={styles.progressButtonSubtitle} numberOfLines={2}>
                    Análisis detallado de tu evolución
                  </Text>
                </View>
              </View>
              <View style={styles.progressButtonArrowContainer}>
                <Icon
                  name="chevron-right"
                  size={IS_SMALL_DEVICE ? 24 : 26}
                  color={theme.primary}
                />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <ProgressSection
          theme={theme}
          period={analysisPeriod}
          onChangePeriod={setAnalysisPeriod}
          hasAnyData={allProgressData.length > 0}
          hasPeriodData={currentPeriodData.length > 0}
          currentData={currentPeriodData}
          previousData={previousPeriodData}
        />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Histórico de Entrenamientos</Text>
            <Text style={styles.sectionSubtitle}>
              {history.length}{" "}
              {history.length === 1
                ? "sesión registrada"
                : "sesiones registradas"}
            </Text>
          </View>

          {history.length === 0 ? (
            <EmptyStateView theme={theme} />
          ) : (
            <FlatList
              data={history}
              keyExtractor={(item) => item.id}
              renderItem={renderHistoryItem}
              scrollEnabled={false}
              contentContainerStyle={styles.historyList}
            />
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ============================================================================
// ESTILOS
// ============================================================================
const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    container: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 20,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.background,
    },
    loadingText: {
      marginTop: 16,
      fontSize: IS_VERY_SMALL_DEVICE
        ? RFValue(14)
        : IS_SMALL_DEVICE
        ? RFValue(15)
        : RFValue(16),
      color: theme.textSecondary,
      fontWeight: "500",
    },
    header: {
      backgroundColor: theme.card,
      paddingHorizontal: IS_VERY_SMALL_DEVICE ? 16 : IS_SMALL_DEVICE ? 18 : 20,
      paddingTop: IS_SMALL_DEVICE ? 16 : 20,
      paddingBottom: IS_SMALL_DEVICE ? 20 : 24,
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 8,
      alignItems: "center",
    },
    exerciseImage: {
      width: IS_VERY_SMALL_DEVICE ? 160 : IS_SMALL_DEVICE ? 180 : 200,
      height: IS_VERY_SMALL_DEVICE ? 160 : IS_SMALL_DEVICE ? 180 : 200,
      borderRadius: IS_SMALL_DEVICE ? 16 : 20,
      marginBottom: IS_SMALL_DEVICE ? 12 : 16,
    },
    exercisePlaceholder: {
      width: IS_VERY_SMALL_DEVICE ? 160 : IS_SMALL_DEVICE ? 180 : 200,
      height: IS_VERY_SMALL_DEVICE ? 160 : IS_SMALL_DEVICE ? 180 : 200,
      borderRadius: IS_SMALL_DEVICE ? 16 : 20,
      marginBottom: IS_SMALL_DEVICE ? 12 : 16,
      backgroundColor: theme.border,
      justifyContent: "center",
      alignItems: "center",
    },
    exercisePlaceholderIcon: {
      fontSize: IS_VERY_SMALL_DEVICE
        ? RFValue(40)
        : IS_SMALL_DEVICE
        ? RFValue(50)
        : RFValue(60),
    },
    exerciseInfo: {
      alignItems: "center",
      width: "100%",
      paddingHorizontal: 10,
    },
    exerciseName: {
      fontSize: IS_VERY_SMALL_DEVICE
        ? RFValue(22)
        : IS_SMALL_DEVICE
        ? RFValue(24)
        : RFValue(28),
      fontWeight: "bold",
      color: theme.text,
      marginBottom: IS_SMALL_DEVICE ? 10 : 12,
      textAlign: "center",
      lineHeight: IS_SMALL_DEVICE ? 28 : 34,
    },
    muscleGroupTag: {
      backgroundColor: `${theme.primary}33`,
      paddingHorizontal: IS_SMALL_DEVICE ? 14 : 16,
      paddingVertical: IS_SMALL_DEVICE ? 6 : 8,
      borderRadius: 20,
      maxWidth: "80%",
    },
    muscleGroupText: {
      fontSize: IS_VERY_SMALL_DEVICE
        ? RFValue(12)
        : IS_SMALL_DEVICE
        ? RFValue(13)
        : RFValue(14),
      fontWeight: "600",
      color: theme.primary,
      textAlign: "center",
    },
    quickStatsSection: {
      paddingHorizontal: IS_VERY_SMALL_DEVICE ? 16 : IS_SMALL_DEVICE ? 18 : 20,
      marginTop: IS_SMALL_DEVICE ? -12 : -15,
      marginBottom: IS_SMALL_DEVICE ? 20 : 24,
    },
    quickStatsGrid: {
      flexDirection: "row",
      backgroundColor: theme.card,
      borderRadius: IS_SMALL_DEVICE ? 16 : 20,
      padding: IS_SMALL_DEVICE ? 12 : 16,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 8,
      alignItems: "center",
    },
    quickStat: {
      flex: 1,
      alignItems: "center",
    },
    quickStatIconContainer: {
      marginBottom: 6,
    },
    quickStatIcon: {
      fontSize: IS_VERY_SMALL_DEVICE
        ? RFValue(18)
        : IS_SMALL_DEVICE
        ? RFValue(20)
        : RFValue(22),
    },
    quickStatValue: {
      fontSize: IS_VERY_SMALL_DEVICE
        ? RFValue(15)
        : IS_SMALL_DEVICE
        ? RFValue(16)
        : RFValue(18),
      fontWeight: "bold",
      color: theme.text,
      marginBottom: 4,
      textAlign: "center",
    },
    quickStatLabel: {
      fontSize: IS_VERY_SMALL_DEVICE
        ? RFValue(10)
        : IS_SMALL_DEVICE
        ? RFValue(11)
        : RFValue(12),
      color: theme.textSecondary,
      fontWeight: "600",
      textAlign: "center",
    },
    quickStatDivider: {
      width: 1,
      height: IS_SMALL_DEVICE ? 40 : 50,
      backgroundColor: theme.border,
    },
    section: {
      paddingHorizontal: IS_VERY_SMALL_DEVICE ? 16 : IS_SMALL_DEVICE ? 18 : 20,
      marginBottom: IS_SMALL_DEVICE ? 20 : 24,
    },
    sectionHeader: {
      marginBottom: IS_SMALL_DEVICE ? 12 : 16,
    },
    sectionTitle: {
      fontSize: IS_VERY_SMALL_DEVICE
        ? RFValue(18)
        : IS_SMALL_DEVICE
        ? RFValue(19)
        : RFValue(20),
      fontWeight: "bold",
      color: theme.text,
      marginBottom: 4,
    },
    sectionSubtitle: {
      fontSize: IS_VERY_SMALL_DEVICE
        ? RFValue(12)
        : IS_SMALL_DEVICE
        ? RFValue(13)
        : RFValue(14),
      color: theme.textSecondary,
      fontWeight: "500",
    },
    periodChips: {
      flexDirection: "row",
      gap: 8,
      paddingBottom: 8,
      marginBottom: 10,
    },
    periodChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
    },
    periodChipActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    periodChipText: {
      color: theme.textSecondary,
      fontWeight: "600",
      fontSize: RFValue(12),
    },
    periodChipTextActive: {
      color: "#fff",
    },
    analysisMetaText: {
      fontSize: RFValue(12),
      color: theme.textSecondary,
      marginBottom: 4,
      fontWeight: "500",
    },
    analysisGrid: {
      marginTop: 10,
      gap: 10,
    },
    analysisCard: {
      backgroundColor: theme.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      padding: IS_SMALL_DEVICE ? 12 : 14,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    analysisCardTitle: {
      color: theme.textSecondary,
      fontSize: RFValue(12),
      fontWeight: "700",
      marginBottom: 4,
    },
    analysisCardValue: {
      color: theme.text,
      fontSize: RFValue(20),
      fontWeight: "800",
      marginBottom: 2,
    },
    analysisCardSubtitle: {
      color: theme.textSecondary,
      fontSize: RFValue(12),
      marginBottom: 6,
    },
    analysisCardMeta: {
      color: theme.textSecondary,
      fontSize: RFValue(12),
      marginBottom: 2,
    },
    analysisCardDelta: {
      color: theme.primary,
      fontSize: RFValue(12),
      fontWeight: "700",
      marginTop: 6,
    },
    analysisEmptyBox: {
      marginTop: 8,
      backgroundColor: theme.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 14,
    },
    analysisEmptyTitle: {
      color: theme.text,
      fontSize: RFValue(14),
      fontWeight: "700",
      marginBottom: 4,
    },
    analysisEmptyText: {
      color: theme.textSecondary,
      fontSize: RFValue(12),
      lineHeight: 18,
    },
    analysisEmptyAction: {
      marginTop: 10,
      alignSelf: "flex-start",
      backgroundColor: theme.primary,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    analysisEmptyActionText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: RFValue(12),
    },
    progressSection: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: IS_VERY_SMALL_DEVICE ? 6 : IS_SMALL_DEVICE ? 8 : 10,
    },
    progressCard: {
      flex: 1,
      backgroundColor: theme.card,
      padding: IS_SMALL_DEVICE ? 10 : 12,
      borderRadius: IS_SMALL_DEVICE ? 10 : 12,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      alignItems: "center",
    },
    progressCardHeader: {
      alignItems: "center",
      marginBottom: 8,
    },
    progressIcon: {
      fontSize: IS_VERY_SMALL_DEVICE
        ? RFValue(18)
        : IS_SMALL_DEVICE
        ? RFValue(20)
        : RFValue(24),
      marginBottom: 4,
    },
    progressTitle: {
      fontSize: IS_VERY_SMALL_DEVICE
        ? RFValue(10)
        : IS_SMALL_DEVICE
        ? RFValue(11)
        : RFValue(12),
      fontWeight: "600",
      color: theme.textSecondary,
      textAlign: "center",
      lineHeight: IS_SMALL_DEVICE ? 14 : 16,
    },
    progressValue: {
      fontSize: IS_VERY_SMALL_DEVICE
        ? RFValue(18)
        : IS_SMALL_DEVICE
        ? RFValue(19)
        : RFValue(20),
      fontWeight: "700",
      marginBottom: 8,
      textAlign: "center",
    },
    progressBar: {
      height: IS_SMALL_DEVICE ? 5 : 6,
      backgroundColor: theme.border,
      borderRadius: 3,
      overflow: "hidden",
      width: "100%",
      marginBottom: 6,
    },
    progressFill: {
      height: "100%",
      borderRadius: 3,
    },
    progressDescription: {
      fontSize: IS_VERY_SMALL_DEVICE
        ? RFValue(9)
        : IS_SMALL_DEVICE
        ? RFValue(10)
        : RFValue(11),
      color: theme.textTertiary,
      fontWeight: "500",
      textAlign: "center",
    },
    historyList: {
      gap: IS_SMALL_DEVICE ? 10 : 12,
    },
    historyCard: {
      backgroundColor: theme.card,
      borderRadius: IS_SMALL_DEVICE ? 14 : 16,
      padding: IS_SMALL_DEVICE ? 14 : 16,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
      position: "relative",
    },
    personalBestCard: {
      borderWidth: 2,
      borderColor: theme.warning,
    },
    personalBestBadge: {
      position: "absolute",
      top: -10,
      right: 20,
      backgroundColor: theme.warning,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
      zIndex: 10,
    },
    personalBestText: {
      fontSize: IS_VERY_SMALL_DEVICE
        ? RFValue(10)
        : IS_SMALL_DEVICE
        ? RFValue(11)
        : RFValue(12),
      fontWeight: "700",
      color: "#FFFFFF",
    },
    historyHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: IS_SMALL_DEVICE ? 10 : 12,
    },
    historyInfo: {
      flex: 1,
      marginRight: 12,
    },
    dateContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 6,
      flexWrap: "wrap",
    },
    historyDateIcon: {
      marginRight: 6,
      fontSize: IS_SMALL_DEVICE ? RFValue(11) : RFValue(12),
    },
    historyDate: {
      fontSize: IS_VERY_SMALL_DEVICE
        ? RFValue(11)
        : IS_SMALL_DEVICE
        ? RFValue(12)
        : RFValue(14),
      fontWeight: "600",
      color: theme.text,
      textTransform: "capitalize",
      flex: 1,
    },
    routineContainer: {
      marginTop: 2,
    },
    routineName: {
      fontSize: IS_VERY_SMALL_DEVICE
        ? RFValue(13)
        : IS_SMALL_DEVICE
        ? RFValue(14)
        : RFValue(15),
      fontWeight: "700",
      color: theme.primary,
      lineHeight: IS_SMALL_DEVICE ? 18 : 20,
    },
    weightBadge: {
      backgroundColor: theme.primary,
      paddingHorizontal: IS_SMALL_DEVICE ? 10 : 12,
      paddingVertical: IS_SMALL_DEVICE ? 6 : 8,
      borderRadius: 12,
      minWidth: IS_SMALL_DEVICE ? 65 : 70,
      alignItems: "center",
    },
    weightLabel: {
      fontSize: IS_VERY_SMALL_DEVICE
        ? RFValue(8)
        : IS_SMALL_DEVICE
        ? RFValue(9)
        : RFValue(10),
      fontWeight: "600",
      color: "#E0D7F5",
      marginBottom: 2,
    },
    weightValue: {
      fontSize: IS_VERY_SMALL_DEVICE
        ? RFValue(12)
        : IS_SMALL_DEVICE
        ? RFValue(13)
        : RFValue(14),
      fontWeight: "bold",
      color: "#FFFFFF",
    },
    historyStats: {
      flexDirection: "row",
      justifyContent: "space-around",
      backgroundColor: theme.backgroundSecondary,
      borderRadius: IS_SMALL_DEVICE ? 10 : 12,
      padding: IS_SMALL_DEVICE ? 10 : 12,
      marginBottom: IS_SMALL_DEVICE ? 10 : 12,
    },
    statItem: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      justifyContent: "center",
      gap: 6,
    },
    statItemIcon: {
      fontSize: IS_VERY_SMALL_DEVICE
        ? RFValue(14)
        : IS_SMALL_DEVICE
        ? RFValue(15)
        : RFValue(16),
    },
    statItemContent: {
      alignItems: "center",
    },
    statLabel: {
      fontSize: IS_VERY_SMALL_DEVICE
        ? RFValue(9)
        : IS_SMALL_DEVICE
        ? RFValue(10)
        : RFValue(11),
      color: theme.textSecondary,
      fontWeight: "500",
    },
    statValue: {
      fontSize: IS_VERY_SMALL_DEVICE
        ? RFValue(14)
        : IS_SMALL_DEVICE
        ? RFValue(15)
        : RFValue(16),
      fontWeight: "bold",
      color: theme.text,
      marginBottom: 2,
    },
    statDivider: {
      width: 1,
      height: IS_SMALL_DEVICE ? 35 : 40,
      backgroundColor: theme.border,
    },
    setsContainer: {
      marginBottom: IS_SMALL_DEVICE ? 10 : 12,
      backgroundColor: theme.backgroundSecondary,
      padding: IS_SMALL_DEVICE ? 10 : 12,
      borderRadius: IS_SMALL_DEVICE ? 10 : 12,
    },
    setsTitle: {
      fontSize: IS_VERY_SMALL_DEVICE
        ? RFValue(12)
        : IS_SMALL_DEVICE
        ? RFValue(13)
        : RFValue(14),
      fontWeight: "600",
      color: theme.textSecondary,
      marginBottom: 8,
    },
    setsList: {
      gap: IS_SMALL_DEVICE ? 5 : 6,
    },
    setItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: IS_SMALL_DEVICE ? 6 : 8,
      paddingHorizontal: IS_SMALL_DEVICE ? 8 : 10,
      borderRadius: 8,
      backgroundColor: theme.card,
      gap: 8,
    },
    completedSet: {
      backgroundColor: "#F0FDF4",
      borderLeftWidth: 3,
      borderLeftColor: theme.success,
    },
    setNumber: {
      width: IS_SMALL_DEVICE ? 22 : 24,
      height: IS_SMALL_DEVICE ? 22 : 24,
      borderRadius: IS_SMALL_DEVICE ? 11 : 12,
      backgroundColor: `${theme.primary}33`,
      justifyContent: "center",
      alignItems: "center",
    },
    setNumberText: {
      fontSize: IS_VERY_SMALL_DEVICE
        ? RFValue(10)
        : IS_SMALL_DEVICE
        ? RFValue(11)
        : RFValue(12),
      fontWeight: "700",
      color: theme.primary,
    },
    setText: {
      flex: 1,
      fontSize: IS_VERY_SMALL_DEVICE
        ? RFValue(11)
        : IS_SMALL_DEVICE
        ? RFValue(12)
        : RFValue(13),
      color: theme.textSecondary,
      fontWeight: "500",
    },
    setStatus: {
      fontSize: IS_SMALL_DEVICE ? RFValue(11) : RFValue(12),
    },
    routineButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: IS_SMALL_DEVICE ? 10 : 12,
      paddingHorizontal: IS_SMALL_DEVICE ? 12 : 14,
      backgroundColor: `${theme.primary}1A`,
      borderRadius: IS_SMALL_DEVICE ? 10 : 12,
      borderWidth: 1,
      borderColor: `${theme.primary}4D`,
    },
    routineButtonText: {
      fontSize: IS_VERY_SMALL_DEVICE
        ? RFValue(12)
        : IS_SMALL_DEVICE
        ? RFValue(13)
        : RFValue(14),
      fontWeight: "600",
      color: theme.primary,
    },
    routineButtonArrow: {
      fontSize: IS_VERY_SMALL_DEVICE
        ? RFValue(14)
        : IS_SMALL_DEVICE
        ? RFValue(15)
        : RFValue(16),
      fontWeight: "bold",
      color: theme.primary,
    },
    emptyState: {
      backgroundColor: theme.card,
      borderRadius: IS_SMALL_DEVICE ? 14 : 16,
      padding: IS_SMALL_DEVICE ? 24 : 32,
      alignItems: "center",
    },
    emptyStateEmoji: {
      fontSize: IS_VERY_SMALL_DEVICE
        ? RFValue(36)
        : IS_SMALL_DEVICE
        ? RFValue(40)
        : RFValue(48),
      marginBottom: IS_SMALL_DEVICE ? 12 : 16,
    },
    emptyStateTitle: {
      fontSize: IS_VERY_SMALL_DEVICE
        ? RFValue(15)
        : IS_SMALL_DEVICE
        ? RFValue(16)
        : RFValue(18),
      fontWeight: "600",
      color: theme.text,
      marginBottom: 8,
      textAlign: "center",
    },
    emptyStateText: {
      fontSize: IS_VERY_SMALL_DEVICE
        ? RFValue(12)
        : IS_SMALL_DEVICE
        ? RFValue(13)
        : RFValue(14),
      color: theme.textSecondary,
      textAlign: "center",
      lineHeight: IS_SMALL_DEVICE ? 18 : 20,
    },
    progressButtonContainer: {
      paddingHorizontal: IS_VERY_SMALL_DEVICE ? 16 : IS_SMALL_DEVICE ? 18 : 20,
      marginBottom: IS_SMALL_DEVICE ? 16 : 20,
    },
    progressButton: {
      backgroundColor: theme.card,
      borderRadius: IS_SMALL_DEVICE ? 16 : 20,
      padding: IS_SMALL_DEVICE ? 14 : 16,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 8,
      borderWidth: 2,
      borderColor: theme.primary + "40",
    },
    progressButtonContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    progressButtonLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      minWidth: 0,
    },
    progressButtonIconContainer: {
      width: IS_SMALL_DEVICE ? 44 : 48,
      height: IS_SMALL_DEVICE ? 44 : 48,
      borderRadius: IS_SMALL_DEVICE ? 12 : 14,
      backgroundColor: theme.primary + "20",
      justifyContent: "center",
      alignItems: "center",
      marginRight: IS_SMALL_DEVICE ? 12 : 14,
      flexShrink: 0,
    },
    progressButtonIcon: {
      fontSize: IS_VERY_SMALL_DEVICE
        ? RFValue(20)
        : IS_SMALL_DEVICE
        ? RFValue(22)
        : RFValue(24),
    },
    progressButtonTextContainer: {
      flex: 1,
      minWidth: 0,
      paddingRight: 8,
    },
    progressButtonTitle: {
      fontSize: IS_VERY_SMALL_DEVICE
        ? RFValue(14)
        : IS_SMALL_DEVICE
        ? RFValue(15)
        : RFValue(16),
      fontWeight: "700",
      color: theme.text,
      marginBottom: 2,
    },
    progressButtonSubtitle: {
      fontSize: IS_VERY_SMALL_DEVICE
        ? RFValue(11)
        : IS_SMALL_DEVICE
        ? RFValue(12)
        : RFValue(13),
      color: theme.textSecondary,
      fontWeight: "500",
    },
    progressButtonArrowContainer: {
      marginLeft: 8,
      width: IS_SMALL_DEVICE ? 24 : 28,
      alignItems: "flex-end",
      justifyContent: "center",
      flexShrink: 0,
    },
    bottomSpacer: {
      height: 20,
    },
  });

export default ExerciseDetailScreen;
