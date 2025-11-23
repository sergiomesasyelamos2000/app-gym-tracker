import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTheme } from "../../../contexts/ThemeContext";
import React, { useCallback, useEffect, useState } from "react";
import { useTheme } from "../../../contexts/ThemeContext";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import { useTheme } from "../../../contexts/ThemeContext";
import { ExerciseRequestDto } from "../../../models";
import { findAllRoutineSessions } from "../services/routineService";
import { WorkoutStackParamList } from "./WorkoutStack";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IS_SMALL_DEVICE = SCREEN_WIDTH < 375;
const IS_VERY_SMALL_DEVICE = SCREEN_WIDTH < 350;

type Props = NativeStackScreenProps<WorkoutStackParamList, "ExerciseDetail">;

// ============================================================================
// TIPOS Y INTERFACES
// ============================================================================
interface ExerciseHistoryItem {
  id: string;
  date: string;
  routineName: string;
  routineId: string;
  sets: any[];
  completedSets: number;
  totalWeight: number;
  totalReps: number;
  volume: number;
  maxWeight: number;
  totalTime: number;
  sessionData: any;
}

// ============================================================================
// UTILIDADES DE IMAGEN
// ============================================================================
const getImageSource = (exercise: ExerciseRequestDto) => {
  if (exercise.giftUrl) {
    return { uri: exercise.giftUrl };
  }

  if (!exercise.imageUrl) return null;

  const isBase64 =
    exercise.imageUrl.startsWith("/9j/") ||
    exercise.imageUrl.startsWith("iVBORw");

  return {
    uri: isBase64
      ? `data:image/jpeg;base64,${exercise.imageUrl}`
      : exercise.imageUrl,
  };
};

const ExerciseImage = ({ exercise, style }: { exercise: any; style: any }) => {
  const [imageError, setImageError] = useState(false);
  const imageSource = getImageSource(exercise);

  if (!imageSource || imageError) {
    return (
      <View style={[style, styles.exercisePlaceholder]}>
        <Text style={styles.exercisePlaceholderIcon}>💪</Text>
      </View>
    );
  }

  return (
    <Image
      source={imageSource}
      style={style}
      onError={() => setImageError(true)}
      resizeMode="cover"
    />
  );
};

// ============================================================================
// CÁLCULOS DE PROGRESO
// ============================================================================
const getValidHistory = (history: ExerciseHistoryItem[]) => {
  return history
    .filter((item) => item.maxWeight > 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

const calculateProgressBetweenSessions = (
  firstSession: ExerciseHistoryItem,
  lastSession: ExerciseHistoryItem
): number => {
  if (firstSession.maxWeight === 0 && lastSession.maxWeight > 0) {
    return 100;
  }

  if (firstSession.maxWeight === 0) {
    return 0;
  }

  const progress =
    ((lastSession.maxWeight - firstSession.maxWeight) /
      firstSession.maxWeight) *
    100;

  return Math.round(progress);
};

const calculateTotalProgress = (history: ExerciseHistoryItem[]): number => {
  const validHistory = getValidHistory(history);
  if (validHistory.length < 2) return 0;

  const oldestSession = validHistory[0];
  const newestSession = validHistory[validHistory.length - 1];

  return calculateProgressBetweenSessions(oldestSession, newestSession);
};

const calculateMonthlyProgress = (history: ExerciseHistoryItem[]): number => {
  const validHistory = getValidHistory(history);
  if (validHistory.length < 2) return 0;

  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const recentSessions = validHistory.filter(
    (session) => new Date(session.date) >= oneMonthAgo
  );

  if (recentSessions.length < 2) return 0;

  const firstRecent = recentSessions[0];
  const lastRecent = recentSessions[recentSessions.length - 1];

  return calculateProgressBetweenSessions(firstRecent, lastRecent);
};

const calculatePersonalBestProgress = (
  history: ExerciseHistoryItem[]
): number => {
  if (history.length === 0) return 0;

  const sorted = [...history].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const personalBest = Math.max(...sorted.map((item) => item.maxWeight));
  const latest = sorted[sorted.length - 1].maxWeight;

  if (personalBest === 0) return 0;

  return Math.round((latest / personalBest) * 100);
};

// ============================================================================
// PROCESAMIENTO DE DATOS
// ============================================================================
const processExerciseFromSession = (
  session: any,
  exerciseId: string
): ExerciseHistoryItem | null => {
  const exerciseEntry = session.exercises?.find(
    (e: any) => e.exerciseId === exerciseId
  );

  if (!exerciseEntry) return null;

  const sets = exerciseEntry.sets || [];
  const completedSets = sets.filter((s: any) => s.completed).length;
  const totalWeight = sets.reduce(
    (sum: number, s: any) => sum + (s.weight || 0),
    0
  );
  const totalReps = sets.reduce(
    (sum: number, s: any) => sum + (s.reps || 0),
    0
  );
  const maxWeight = sets
    .filter((s: any) => s.completed && s.weight > 0)
    .reduce((max: number, s: any) => Math.max(max, s.weight), 0);

  return {
    id: session.id,
    date: session.createdAt,
    routineName: session.routine?.title || "Entrenamiento sin título",
    routineId: session.routine?.id,
    sets,
    completedSets,
    totalWeight,
    totalReps,
    volume: totalWeight * totalReps,
    maxWeight,
    totalTime: session.totalTime,
    sessionData: session,
  };
};

// Formatear números grandes
const formatNumber = (num: number) => {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
};

// ============================================================================
// COMPONENTES
// ============================================================================
const LoadingView = () => (
  <SafeAreaView style={styles.safeArea}>
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#6C3BAA" />
      <Text style={styles.loadingText}>Cargando histórico...</Text>
    </View>
  </SafeAreaView>
);

const EmptyStateView = () => (
  <View style={styles.emptyState}>
    <Text style={styles.emptyStateEmoji}>📊</Text>
    <Text style={styles.emptyStateTitle}>No hay datos históricos</Text>
    <Text style={styles.emptyStateText}>
      Realiza este ejercicio en alguna rutina para comenzar a trackear tu
      progreso.
    </Text>
  </View>
);

interface HeaderProps {
  exercise: ExerciseRequestDto;
  fadeAnim: Animated.Value;
}

const Header = ({ exercise, fadeAnim }: HeaderProps) => (
  <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
    <ExerciseImage exercise={exercise} style={styles.exerciseImage} />
    <View style={styles.exerciseInfo}>
      <Text style={styles.exerciseName} numberOfLines={2}>
        {exercise.name}
      </Text>
      {exercise.targetMuscles?.length > 0 && (
        <View style={styles.muscleGroupTag}>
          <Text style={styles.muscleGroupText} numberOfLines={1}>
            {exercise.targetMuscles[0]}
          </Text>
        </View>
      )}
    </View>
  </Animated.View>
);

interface QuickStatsProps {
  currentWeight: number;
  totalSessions: number;
  maxWeight: number;
}

const QuickStats = ({
  currentWeight,
  totalSessions,
  maxWeight,
}: QuickStatsProps) => (
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

interface ProgressCardProps {
  title: string;
  value: number;
  icon: string;
}

const ProgressCard = ({ title, value, icon }: ProgressCardProps) => {
  const isPositive = value >= 0;
  const color = isPositive ? "#10B981" : "#EF4444";

  return (
    <View style={styles.progressCard}>
      <View style={styles.progressCardHeader}>
        <Text style={styles.progressIcon}>{icon}</Text>
        <Text style={styles.progressTitle} numberOfLines={2}>
          {title}
        </Text>
      </View>
      <Text style={[styles.progressValue, { color }]} numberOfLines={1}>
        {value > 0 ? "+" : ""}
        {value}%
      </Text>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.min(Math.max(Math.abs(value), 0), 100)}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>
      <Text style={styles.progressDescription}>
        {isPositive ? "Mejora" : "Por debajo"}
      </Text>
    </View>
  );
};

interface ProgressSectionProps {
  totalProgress: number;
  monthlyProgress: number;
  personalBestProgress: number;
}

const ProgressSection = ({
  totalProgress,
  monthlyProgress,
  personalBestProgress,
}: ProgressSectionProps) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>Análisis de Progreso</Text>
      <Text style={styles.sectionSubtitle}>Tu evolución en el tiempo</Text>
    </View>
    <View style={styles.progressSection}>
      <ProgressCard title="Progreso Total" value={totalProgress} icon="📈" />
      <ProgressCard title="Último Mes" value={monthlyProgress} icon="📅" />
      <ProgressCard title="vs Récord" value={personalBestProgress} icon="🎯" />
    </View>
  </View>
);

interface HistoryCardProps {
  item: ExerciseHistoryItem;
  fadeAnim: Animated.Value;
  onNavigateToRoutine: (routineId: string, routine: any) => void;
}

const HistoryCard = ({
  item,
  fadeAnim,
  onNavigateToRoutine,
}: HistoryCardProps) => {
  const isPersonalBest =
    item.maxWeight ===
    Math.max(
      ...item.sessionData.exercises
        .filter((e: any) => e.exerciseId === item.sessionData.exercises[0].id)
        .map((e: any) =>
          Math.max(
            ...e.sets.filter((s: any) => s.completed).map((s: any) => s.weight)
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
            {item.sets.map((set: any, i: number) => (
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

      <TouchableOpacity
        style={styles.routineButton}
        onPress={() =>
          onNavigateToRoutine(
            item.sessionData.routine?.id,
            item.sessionData.routine
          )
        }
        activeOpacity={0.7}
      >
        <Text style={styles.routineButtonText}>Ver sesión completa</Text>
        <Text style={styles.routineButtonArrow}>→</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export const ExerciseDetailScreen = ({ route, navigation }: Props) => {
  const { exercise } = route.params;

  // Estado
  const [fadeAnim] = useState(new Animated.Value(0));
  const [history, setHistory] = useState<ExerciseHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch de datos
  const fetchExerciseHistory = useCallback(async () => {
    try {
      setLoading(true);
      const sessionsData = await findAllRoutineSessions();

      const exerciseHistory = sessionsData
        .map((session: any) => processExerciseFromSession(session, exercise.id))
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
  const stats = {
    totalSessions: history.length,
    maxWeight:
      history.length > 0 ? Math.max(...history.map((i) => i.maxWeight)) : 0,
    currentWeight: history.length > 0 ? history[0].maxWeight : 0,
    totalVolume: history.reduce((s, i) => s + i.volume, 0),
  };

  const progress = {
    total: calculateTotalProgress(history),
    monthly: calculateMonthlyProgress(history),
    personalBest: calculatePersonalBestProgress(history),
  };

  // Navegación
  const handleNavigateToRoutine = useCallback(
    (routineId: string, routine: any) => {
      navigation.navigate("RoutineDetail", { routineId, routine });
    },
    [navigation]
  );

  // Render de item del histórico
  const renderHistoryItem = ({ item }: { item: ExerciseHistoryItem }) => (
    <HistoryCard
      item={item}
      fadeAnim={fadeAnim}
      onNavigateToRoutine={handleNavigateToRoutine}
    />
  );

  if (loading) {
    return <LoadingView />;
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
            colors={["#6C3BAA"]}
            tintColor="#6C3BAA"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Header exercise={exercise} fadeAnim={fadeAnim} />

        <QuickStats
          currentWeight={stats.currentWeight}
          totalSessions={stats.totalSessions}
          maxWeight={stats.maxWeight}
        />

        {history.length > 0 && (
          <ProgressSection
            totalProgress={progress.total}
            monthlyProgress={progress.monthly}
            personalBestProgress={progress.personalBest}
          />
        )}

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
            <EmptyStateView />
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
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
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
    backgroundColor: "#F8FAFC",
  },
  loadingText: {
    marginTop: 16,
    fontSize: IS_VERY_SMALL_DEVICE
      ? RFValue(14)
      : IS_SMALL_DEVICE
      ? RFValue(15)
      : RFValue(16),
    color: "#64748B",
    fontWeight: "500",
  },
  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: IS_VERY_SMALL_DEVICE ? 16 : IS_SMALL_DEVICE ? 18 : 20,
    paddingTop: IS_SMALL_DEVICE ? 16 : 20,
    paddingBottom: IS_SMALL_DEVICE ? 20 : 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: "#6C3BAA",
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
    backgroundColor: "#E2E8F0",
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
    color: "#1E293B",
    marginBottom: IS_SMALL_DEVICE ? 10 : 12,
    textAlign: "center",
    lineHeight: IS_SMALL_DEVICE ? 28 : 34,
  },
  muscleGroupTag: {
    backgroundColor: "#6C3BAA20",
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
    color: "#6C3BAA",
    textAlign: "center",
  },
  quickStatsSection: {
    paddingHorizontal: IS_VERY_SMALL_DEVICE ? 16 : IS_SMALL_DEVICE ? 18 : 20,
    marginTop: IS_SMALL_DEVICE ? -12 : -15,
    marginBottom: IS_SMALL_DEVICE ? 20 : 24,
  },
  quickStatsGrid: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: IS_SMALL_DEVICE ? 16 : 20,
    padding: IS_SMALL_DEVICE ? 12 : 16,
    shadowColor: "#000",
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
    color: "#1E293B",
    marginBottom: 4,
    textAlign: "center",
  },
  quickStatLabel: {
    fontSize: IS_VERY_SMALL_DEVICE
      ? RFValue(10)
      : IS_SMALL_DEVICE
      ? RFValue(11)
      : RFValue(12),
    color: "#64748B",
    fontWeight: "600",
    textAlign: "center",
  },
  quickStatDivider: {
    width: 1,
    height: IS_SMALL_DEVICE ? 40 : 50,
    backgroundColor: "#F1F5F9",
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
    color: "#1E293B",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: IS_VERY_SMALL_DEVICE
      ? RFValue(12)
      : IS_SMALL_DEVICE
      ? RFValue(13)
      : RFValue(14),
    color: "#64748B",
    fontWeight: "500",
  },
  progressSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: IS_VERY_SMALL_DEVICE ? 6 : IS_SMALL_DEVICE ? 8 : 10,
  },
  progressCard: {
    flex: 1,
    backgroundColor: "#FFF",
    padding: IS_SMALL_DEVICE ? 10 : 12,
    borderRadius: IS_SMALL_DEVICE ? 10 : 12,
    shadowColor: "#000",
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
    color: "#64748B",
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
    backgroundColor: "#E5E7EB",
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
    color: "#94A3B8",
    fontWeight: "500",
    textAlign: "center",
  },
  historyList: {
    gap: IS_SMALL_DEVICE ? 10 : 12,
  },
  historyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: IS_SMALL_DEVICE ? 14 : 16,
    padding: IS_SMALL_DEVICE ? 14 : 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: "relative",
  },
  personalBestCard: {
    borderWidth: 2,
    borderColor: "#F59E0B",
  },
  personalBestBadge: {
    position: "absolute",
    top: -10,
    right: 20,
    backgroundColor: "#F59E0B",
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
    color: "#1E293B",
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
    color: "#6C3BAA",
    lineHeight: IS_SMALL_DEVICE ? 18 : 20,
  },
  weightBadge: {
    backgroundColor: "#6C3BAA",
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
    backgroundColor: "#F8FAFC",
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
    color: "#64748B",
    fontWeight: "500",
  },
  statValue: {
    fontSize: IS_VERY_SMALL_DEVICE
      ? RFValue(14)
      : IS_SMALL_DEVICE
      ? RFValue(15)
      : RFValue(16),
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 2,
  },
  statDivider: {
    width: 1,
    height: IS_SMALL_DEVICE ? 35 : 40,
    backgroundColor: "#E2E8F0",
  },
  setsContainer: {
    marginBottom: IS_SMALL_DEVICE ? 10 : 12,
    backgroundColor: "#F8FAFC",
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
    color: "#64748B",
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
    backgroundColor: "#FFFFFF",
    gap: 8,
  },
  completedSet: {
    backgroundColor: "#F0FDF4",
    borderLeftWidth: 3,
    borderLeftColor: "#10B981",
  },
  setNumber: {
    width: IS_SMALL_DEVICE ? 22 : 24,
    height: IS_SMALL_DEVICE ? 22 : 24,
    borderRadius: IS_SMALL_DEVICE ? 11 : 12,
    backgroundColor: "#6C3BAA20",
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
    color: "#6C3BAA",
  },
  setText: {
    flex: 1,
    fontSize: IS_VERY_SMALL_DEVICE
      ? RFValue(11)
      : IS_SMALL_DEVICE
      ? RFValue(12)
      : RFValue(13),
    color: "#475569",
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
    backgroundColor: "#6C3BAA10",
    borderRadius: IS_SMALL_DEVICE ? 10 : 12,
    borderWidth: 1,
    borderColor: "#6C3BAA30",
  },
  routineButtonText: {
    fontSize: IS_VERY_SMALL_DEVICE
      ? RFValue(12)
      : IS_SMALL_DEVICE
      ? RFValue(13)
      : RFValue(14),
    fontWeight: "600",
    color: "#6C3BAA",
  },
  routineButtonArrow: {
    fontSize: IS_VERY_SMALL_DEVICE
      ? RFValue(14)
      : IS_SMALL_DEVICE
      ? RFValue(15)
      : RFValue(16),
    fontWeight: "bold",
    color: "#6C3BAA",
  },
  emptyState: {
    backgroundColor: "#FFFFFF",
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
    color: "#1E293B",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: IS_VERY_SMALL_DEVICE
      ? RFValue(12)
      : IS_SMALL_DEVICE
      ? RFValue(13)
      : RFValue(14),
    color: "#64748B",
    textAlign: "center",
    lineHeight: IS_SMALL_DEVICE ? 18 : 20,
  },
  bottomSpacer: {
    height: 20,
  },
});

export default ExerciseDetailScreen;
