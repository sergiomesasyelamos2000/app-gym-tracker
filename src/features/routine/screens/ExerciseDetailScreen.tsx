import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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
import { ExerciseRequestDto } from "../../../models";
import { findAllRoutineSessions } from "../services/routineService";
import { WorkoutStackParamList } from "./WorkoutStack";

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
    return <View style={[style, styles.exercisePlaceholder]} />;
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
      <Text style={styles.exerciseName}>{exercise.name}</Text>
      {exercise.targetMuscles?.length > 0 && (
        <View style={styles.muscleGroupTag}>
          <Text style={styles.muscleGroupText}>
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
        <Text style={styles.quickStatValue}>
          {currentWeight > 0 ? `${currentWeight} kg` : "N/A"}
        </Text>
        <Text style={styles.quickStatLabel}>Peso actual</Text>
      </View>
      <View style={styles.quickStatDivider} />
      <View style={styles.quickStat}>
        <Text style={styles.quickStatValue}>{totalSessions}</Text>
        <Text style={styles.quickStatLabel}>Sesiones</Text>
      </View>
      <View style={styles.quickStatDivider} />
      <View style={styles.quickStat}>
        <Text style={styles.quickStatValue}>{maxWeight}</Text>
        <Text style={styles.quickStatLabel}>Récord</Text>
      </View>
    </View>
  </View>
);

interface ProgressCardProps {
  title: string;
  value: number;
}

const ProgressCard = ({ title, value }: ProgressCardProps) => (
  <View style={styles.progressCard}>
    <Text style={styles.progressTitle}>{title}</Text>
    <Text
      style={[
        styles.progressValue,
        { color: value >= 0 ? "#10B981" : "#EF4444" },
      ]}
    >
      {value > 0 ? "+" : ""}
      {value}%
    </Text>
    <View style={styles.progressBar}>
      <View
        style={[
          styles.progressFill,
          {
            width: `${Math.min(Math.max(value, 0), 100)}%`,
            backgroundColor: value >= 0 ? "#10B981" : "#EF4444",
          },
        ]}
      />
    </View>
  </View>
);

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
    <Text style={styles.sectionTitle}>Progreso Real</Text>
    <View style={styles.progressSection}>
      <ProgressCard title="Progreso Total" value={totalProgress} />
      <ProgressCard title="Último Mes" value={monthlyProgress} />
      <ProgressCard title="Récord Personal" value={personalBestProgress} />
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
}: HistoryCardProps) => (
  <Animated.View
    style={[
      styles.historyCard,
      {
        opacity: fadeAnim,
        transform: [
          {
            translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0],
            }),
          },
        ],
      },
    ]}
  >
    <View style={styles.historyHeader}>
      <View style={styles.historyInfo}>
        <View style={styles.dateContainer}>
          <Text style={styles.historyDateIcon}>📅</Text>
          <Text style={styles.historyDate}>
            {new Date(item.date).toLocaleDateString("es-ES", {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
          </Text>
        </View>
        <View style={styles.routineContainer}>
          <Text style={styles.routineName}>{item.routineName}</Text>
        </View>
      </View>
      <View style={styles.weightBadge}>
        <Text style={styles.weightValue}>{item.maxWeight} kg</Text>
      </View>
    </View>

    <View style={styles.historyStats}>
      <View style={styles.statItem}>
        <Text style={styles.statLabel}>Series</Text>
        <Text style={styles.statValue}>{item.completedSets}</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statLabel}>Reps</Text>
        <Text style={styles.statValue}>{item.totalReps}</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statLabel}>Volumen</Text>
        <Text style={styles.statValue}>{item.volume} kg</Text>
      </View>
    </View>

    {item.sets?.length > 0 && (
      <View style={styles.setsContainer}>
        <Text style={styles.setsTitle}>Series:</Text>
        <View style={styles.setsList}>
          {item.sets.map((set: any, i: number) => (
            <View
              key={i}
              style={[styles.setItem, set.completed && styles.completedSet]}
            >
              <Text style={styles.setText}>
                {i + 1}. {set.weight}kg × {set.reps} reps{" "}
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
    >
      <Text style={styles.routineButtonText}>Ver sesión completa →</Text>
    </TouchableOpacity>
  </Animated.View>
);

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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#6C3BAA"]}
            tintColor="#6C3BAA"
          />
        }
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
          <Text style={styles.sectionTitle}>Histórico por Rutinas</Text>

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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  loadingText: {
    marginTop: 16,
    fontSize: RFValue(16),
    color: "#64748B",
    fontWeight: "500",
  },
  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
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
    width: 200,
    height: 200,
    borderRadius: 20,
    marginBottom: 16,
  },
  exercisePlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 20,
    marginBottom: 16,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  exerciseInfo: {
    alignItems: "center",
  },
  exerciseName: {
    fontSize: RFValue(28),
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 12,
    textAlign: "center",
  },
  muscleGroupTag: {
    backgroundColor: "#6C3BAA20",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  muscleGroupText: {
    fontSize: RFValue(14),
    fontWeight: "600",
    color: "#6C3BAA",
  },
  quickStatsSection: {
    paddingHorizontal: 20,
    marginTop: -15,
    marginBottom: 24,
  },
  quickStatsGrid: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
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
  quickStatValue: {
    fontSize: RFValue(18),
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 4,
  },
  quickStatLabel: {
    fontSize: RFValue(12),
    color: "#64748B",
    fontWeight: "600",
  },
  quickStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#F1F5F9",
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: RFValue(20),
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 16,
  },
  progressSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  progressCard: {
    flex: 1,
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressTitle: {
    fontSize: RFValue(12),
    fontWeight: "600",
    marginBottom: 8,
    color: "#64748B",
  },
  progressValue: {
    fontSize: RFValue(20),
    fontWeight: "700",
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  historyList: {
    gap: 12,
  },
  historyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  historyInfo: {
    flex: 1,
    marginRight: 12,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  historyDateIcon: {
    marginRight: 8,
  },
  historyDate: {
    fontSize: RFValue(14),
    fontWeight: "600",
    color: "#1E293B",
    textTransform: "capitalize",
  },
  routineContainer: {
    marginTop: 4,
  },
  routineName: {
    fontSize: RFValue(15),
    fontWeight: "700",
    color: "#6C3BAA",
  },
  weightBadge: {
    backgroundColor: "#6C3BAA",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 70,
    alignItems: "center",
  },
  weightValue: {
    fontSize: RFValue(14),
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  historyStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statLabel: {
    fontSize: RFValue(12),
    color: "#64748B",
    fontWeight: "500",
    marginBottom: 4,
  },
  statValue: {
    fontSize: RFValue(16),
    fontWeight: "bold",
    color: "#1E293B",
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#E2E8F0",
  },
  setsContainer: {
    marginBottom: 12,
  },
  setsTitle: {
    fontSize: RFValue(14),
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 8,
  },
  setsList: {
    gap: 4,
  },
  setItem: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  completedSet: {
    backgroundColor: "#F0FDF4",
  },
  setText: {
    fontSize: RFValue(13),
    color: "#475569",
    fontWeight: "500",
  },
  routineButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
  },
  routineButtonText: {
    fontSize: RFValue(13),
    fontWeight: "600",
    color: "#6C3BAA",
  },
  emptyState: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
  },
  emptyStateEmoji: {
    fontSize: RFValue(48),
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: RFValue(18),
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: RFValue(14),
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
});

export default ExerciseDetailScreen;
