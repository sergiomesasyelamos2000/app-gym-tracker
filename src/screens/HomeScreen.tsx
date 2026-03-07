import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import {
  CompositeNavigationProp,
  useFocusEffect,
  useNavigation,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  ImageStyle,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CachedExerciseImage from "../components/CachedExerciseImage";
import { useTheme } from "../contexts/ThemeContext";
import type { WorkoutStackParamList } from "../features/routine/screens/WorkoutStack";
import {
  findAllRoutineSessions,
  getGlobalStats,
} from "../features/routine/services/routineService";
import type { GlobalStats } from "../features/routine/services/routineService";
import { useResponsive } from "../hooks/useResponsive";
import { useAuthStore } from "../store/useAuthStore";

// Types for session exercises (from backend)
interface SessionExercise {
  exerciseId: string;
  name: string;
  imageUrl?: string;
  giftUrl?: string;
  sets: {
    weight: number;
    reps: number;
    completed: boolean;
    isRecord?: boolean;
  }[];
  totalReps?: number; // Optional, calculated on the fly
}

type RawSessionExercise = {
  exerciseId?: string;
  id?: string;
  name?: string;
  exerciseName?: string;
  imageUrl?: string;
  giftUrl?: string;
  gifUrl?: string;
  image?: string;
  exercise?: {
    id?: string;
    name?: string;
    imageUrl?: string;
    giftUrl?: string;
    gifUrl?: string;
    image?: string;
  };
  sets?: {
    weight?: number;
    reps?: number;
    completed?: boolean;
    isRecord?: boolean;
  }[];
};

// Type for session with calculated totals
interface SessionWithTotals {
  id: string;
  routine?: {
    id: string;
    title: string;
  };
  exercises?: SessionExercise[];
  totalTime: number;
  totalWeight: number;
  completedSets: number;
  totalReps?: number;
  createdAt: Date | string;
}

// GlobalStats is now imported from routineService

const toSafeNumber = (value: unknown): number => {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;

  return Number.isFinite(parsed) ? parsed : 0;
};

const formatSessionDuration = (totalSeconds: number): string => {
  const safeSeconds = Math.max(0, toSafeNumber(totalSeconds));
  const totalMinutes = Math.floor(safeSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (totalMinutes === 0) return `${safeSeconds}s`;
  if (hours === 0) return `${totalMinutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

const normalizeSessionExercise = (
  exercise: RawSessionExercise,
  index: number
): SessionExercise => {
  const imageUrl =
    exercise.imageUrl ||
    exercise.exercise?.imageUrl ||
    exercise.image ||
    exercise.exercise?.image;

  const giftUrl =
    exercise.giftUrl ||
    exercise.gifUrl ||
    exercise.exercise?.giftUrl ||
    exercise.exercise?.gifUrl;

  return {
    exerciseId:
      exercise.exerciseId ||
      exercise.id ||
      exercise.exercise?.id ||
      `exercise-${index}`,
    name:
      exercise.name ||
      exercise.exerciseName ||
      exercise.exercise?.name ||
      "Ejercicio",
    imageUrl,
    giftUrl,
    sets: (exercise.sets || []).map((set) => ({
      weight: toSafeNumber(set.weight),
      reps: toSafeNumber(set.reps),
      completed: Boolean(set.completed),
      isRecord: Boolean(set.isRecord),
    })),
  };
};

// Componente para mostrar la imagen del ejercicio con manejo de errores
const ExerciseImage = ({
  exercise,
  style,
}: {
  exercise: SessionExercise;
  style: StyleProp<ImageStyle>;
}) => {
  // Always use static image in session history (avoid animated GIFs)
  return <CachedExerciseImage imageUrl={exercise.imageUrl} style={style} />;
};

type BottomTabsParamList = {
  Inicio: undefined;
  Login: undefined;
  Entreno:
    | undefined
    | {
        screen?: keyof WorkoutStackParamList;
        params?: Record<string, unknown>;
      };
  Nutrición: undefined;
  Macros: undefined;
};

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<BottomTabsParamList, "Inicio">,
  NativeStackNavigationProp<WorkoutStackParamList>
>;

export default function HomeScreen() {
  const [sessions, setSessions] = useState<SessionWithTotals[]>([]);
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSessionIds, setExpandedSessionIds] = useState<Set<string>>(
    new Set()
  );
  const [currentTime, setCurrentTime] = useState(new Date());
  const [motivationalQuote, setMotivationalQuote] = useState<string>("");
  const { theme, isDark } = useTheme();
  const user = useAuthStore((state) => state.user);
  const welcomeMessage = useAuthStore((state) => state.welcomeMessage);
  const clearWelcomeMessage = useAuthStore((state) => state.clearWelcomeMessage);
  const responsive = useResponsive();

  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(1))[0];
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  // Listener para el tab press
  useEffect(() => {
    const unsubscribe = navigation.addListener("tabPress", (e) => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  // Actualizar hora en tiempo real según el reloj del sistema
  useEffect(() => {
    const updateCurrentTime = () => {
      setCurrentTime(new Date());
    };

    updateCurrentTime();
    const timer = setInterval(updateCurrentTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Período del día (solo cambia cuando el saludo debe cambiar)
  const dayPeriod = useMemo(() => {
    const currentHour = currentTime.getHours();
    if (currentHour < 12) return "morning";
    if (currentHour < 20) return "afternoon";
    return "night";
  }, [currentTime]);

  // Saludo según período del día
  const greeting = useMemo(() => {
    switch (dayPeriod) {
      case "morning":
        return "¡Buenos días! ☀️";
      case "afternoon":
        return "¡Buenas tardes! 🌤️";
      case "night":
        return "¡Buenas noches! 🌙";
      default:
        return "¡Hola! 👋";
    }
  }, [dayPeriod]);

  // Generar quote motivacional
  const generateMotivationalQuote = useCallback(() => {
    const quotes = [
      "El único límite es tu mente",
      "Cada repetición te acerca a tu meta",
      "La disciplina supera al talento",
      "Hoy es un buen día para ser mejor",
      "Tu cuerpo puede lograr lo que tu mente cree",
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  }, []);

  // Actualizar quote solo cuando cambia el saludo
  useEffect(() => {
    setMotivationalQuote(generateMotivationalQuote());
  }, [greeting, generateMotivationalQuote]);

  useEffect(() => {
    if (!initialLoading && welcomeMessage) {
      Alert.alert("¡Bienvenido!", welcomeMessage);
      clearWelcomeMessage();
    }
  }, [initialLoading, welcomeMessage, clearWelcomeMessage]);

  // Formato de hora sin segundos
  const formattedTime = currentTime.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Cargar datos
  const fetchData = useCallback(async () => {
    if (!user?.id) {
      setInitialLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const [globalStats, sessionsData] = await Promise.all([
        getGlobalStats(),
        findAllRoutineSessions(),
      ]);

      const sessionsWithTotals = sessionsData.map(
        (session): SessionWithTotals => {
          const normalizedExercises: SessionExercise[] = (
            (session.exercises as RawSessionExercise[] | undefined) || []
          ).map((exercise, index) => normalizeSessionExercise(exercise, index));

          const calculatedWeight =
            normalizedExercises.reduce(
              (sum: number, e) =>
                sum +
                (e.sets || []).reduce(
                  (acc: number, s) =>
                    acc +
                    toSafeNumber((s as { weight?: unknown }).weight) *
                      toSafeNumber((s as { reps?: unknown }).reps),
                  0
                ),
              0
            ) || 0;

          const totalReps =
            normalizedExercises.reduce((sum: number, e) => {
              const exerciseTotalReps = (e.sets || []).reduce(
                (acc: number, s) =>
                  acc + toSafeNumber((s as { reps?: unknown }).reps),
                0
              );
              return sum + exerciseTotalReps;
            }, 0) || 0;

          const sessionTotalWeight = toSafeNumber(
            (session as { totalWeight?: unknown }).totalWeight
          );
          const sessionTotalTime = toSafeNumber(
            (session as { totalTime?: unknown }).totalTime
          );
          const sessionCompletedSets = toSafeNumber(
            (session as { completedSets?: unknown }).completedSets
          );

          return {
            ...session,
            exercises: normalizedExercises,
            totalTime: sessionTotalTime,
            totalWeight: sessionTotalWeight || calculatedWeight,
            completedSets: sessionCompletedSets,
            totalReps,
            createdAt:
              (session as { createdAt?: Date | string }).createdAt ||
              new Date().toISOString(),
          };
        }
      );

      const fallbackDuration = sessionsWithTotals.reduce(
        (sum, session) => sum + toSafeNumber(session.totalTime),
        0
      );
      const fallbackVolume = sessionsWithTotals.reduce(
        (sum, session) => sum + toSafeNumber(session.totalWeight),
        0
      );
      const fallbackSessions = sessionsWithTotals.length;

      const resolvedStats: GlobalStats = {
        ...globalStats,
        totalDuration:
          toSafeNumber(globalStats.totalDuration) || fallbackDuration,
        totalVolume: toSafeNumber(globalStats.totalVolume) || fallbackVolume,
        totalSessions:
          toSafeNumber(globalStats.totalSessions) || fallbackSessions,
      };

      setStats(resolvedStats);
      setSessions(sessionsWithTotals);
    } catch (error) {
      console.error("Error fetching data", error);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
      fetchData();
    }, [fetchData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleStartWorkout = () => {
    // Animación de press
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    navigation.navigate("Entreno", {
      screen: "WorkoutList",
    });
  };

  const toggleSessionExpanded = useCallback((sessionId: string) => {
    setExpandedSessionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  }, []);

  // Renderizar SessionCard como componente separado para mejor performance
  const renderSessionCard = useCallback(
    ({ item: session }: { item: SessionWithTotals }) => {
      const cardWidth =
        responsive.sessionColumns === 2
          ? (responsive.width - 60) / 2
          : responsive.width - 40;
      const previewLimit = responsive.isTablet ? 3 : 4;
      const isExpanded = expandedSessionIds.has(session.id);
      const visibleExercises = isExpanded
        ? session.exercises || []
        : (session.exercises || []).slice(0, previewLimit);
      const remainingExercises = Math.max(
        0,
        (session.exercises?.length || 0) - previewLimit
      );

      return (
        <Pressable
          key={session.id}
          style={[
            styles.sessionCard,
            {
              backgroundColor: theme.card,
              shadowColor: theme.shadowColor,
              borderWidth: isDark ? 1 : 0,
              borderColor: theme.border,
              width: cardWidth,
            },
          ]}
          android_ripple={{ color: theme.primary + "20" }}
        >
          <View style={styles.sessionHeader}>
            <View style={styles.sessionDateContainer}>
              <Text style={styles.sessionDateIcon}>📅</Text>
              <Text
                style={[styles.sessionDate, { color: theme.textSecondary }]}
              >
                {new Date(session.createdAt).toLocaleDateString("es-ES", {
                  weekday: responsive.isTablet ? "long" : "short",
                  year: "numeric",
                  month: responsive.isTablet ? "long" : "short",
                  day: "numeric",
                })}
              </Text>
            </View>
            <Text style={[styles.sessionTitle, { color: theme.text }]}>
              {session.routine?.title || "Entrenamiento sin título"}
            </Text>
          </View>

          <View
            style={[styles.sessionStats, { backgroundColor: theme.background }]}
          >
            <View style={styles.sessionStat}>
              <Text style={styles.sessionStatIcon}>⏱️</Text>
              <Text
                style={[styles.sessionStatText, { color: theme.textSecondary }]}
              >
                {formatSessionDuration(session.totalTime)}
              </Text>
            </View>
            <View style={styles.sessionStat}>
              <Text style={styles.sessionStatIcon}>🏋️</Text>
              <Text
                style={[styles.sessionStatText, { color: theme.textSecondary }]}
              >
                {session.totalWeight} kg
              </Text>
            </View>
            <View style={styles.sessionStat}>
              <Text style={styles.sessionStatIcon}>✅</Text>
              <Text
                style={[styles.sessionStatText, { color: theme.textSecondary }]}
              >
                {session.completedSets} series
              </Text>
            </View>
            {/* Récords en la sesión */}
            {(() => {
              const totalRecords =
                session.exercises?.reduce(
                  (acc: number, ex: SessionExercise) => {
                    return (
                      acc + (ex.sets?.filter((s) => s.isRecord).length || 0)
                    );
                  },
                  0
                ) || 0;

              if (totalRecords > 0) {
                return (
                  <View style={styles.sessionStat}>
                    <Text style={styles.sessionStatIcon}>🏆</Text>
                    <Text
                      style={[
                        styles.sessionStatText,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {totalRecords}
                    </Text>
                  </View>
                );
              }
              return null;
            })()}
          </View>

          {(session.exercises?.length ?? 0) > 0 && (
            <View
              style={[
                styles.exercisesSection,
                { borderTopColor: theme.divider },
              ]}
            >
              <Text
                style={[styles.exercisesTitle, { color: theme.textSecondary }]}
              >
                Ejercicios realizados:
              </Text>
              <View style={styles.exercisesList}>
                {visibleExercises.map((exercise: SessionExercise) => (
                  <View key={exercise.exerciseId} style={styles.exerciseItem}>
                    <ExerciseImage exercise={exercise} style={styles.exerciseImage} />
                    <View style={styles.exerciseInfo}>
                      <Text
                        style={[styles.exerciseName, { color: theme.text }]}
                        numberOfLines={1}
                      >
                        {exercise.name}
                      </Text>
                      <Text
                        style={[styles.exerciseSets, { color: theme.textSecondary }]}
                      >
                        {exercise.sets?.length || 0} series
                      </Text>
                    </View>
                  </View>
                ))}
                {remainingExercises > 0 && !isExpanded && (
                  <TouchableOpacity
                    style={styles.moreExercises}
                    onPress={() => toggleSessionExpanded(session.id)}
                  >
                    <Text
                      style={[styles.moreExercisesText, { color: theme.primary }]}
                    >
                      +{remainingExercises} más
                    </Text>
                  </TouchableOpacity>
                )}
                {remainingExercises > 0 && isExpanded && (
                  <TouchableOpacity
                    style={styles.moreExercises}
                    onPress={() => toggleSessionExpanded(session.id)}
                  >
                    <Text
                      style={[styles.moreExercisesText, { color: theme.primary }]}
                    >
                      Mostrar menos
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </Pressable>
      );
    },
    [theme, isDark, responsive, expandedSessionIds, toggleSessionExpanded]
  );

  return (
    <View
      style={[
        styles.mainContainer,
        {
          backgroundColor: initialLoading
            ? theme.backgroundSecondary
            : theme.primary,
        },
      ]}
    >
      <StatusBar
        barStyle={initialLoading ? (isDark ? "light-content" : "dark-content") : "light-content"}
        backgroundColor={initialLoading ? theme.backgroundSecondary : theme.primary}
        translucent={true}
      />
      <SafeAreaView
        style={[
          styles.safeArea,
          Platform.OS === "android" ? { paddingTop: insets.top } : null,
        ]}
      >
        {initialLoading ? (
          <View style={styles.fullScreenLoading}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.fullScreenLoadingText, { color: theme.text }]}>
              Cargando datos...
            </Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            style={styles.container}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[theme.primary]}
                tintColor="#FFFFFF"
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 0 }}
          >
          {/* Header Section */}
          <Animated.View
            style={[
              styles.header,
              {
                backgroundColor: theme.primary,
                shadowColor: isDark ? "#000" : theme.primary,
                opacity: fadeAnim,
              },
            ]}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerGreeting}>{greeting}</Text>
                <Text style={styles.headerTitle}>
                  {user?.name || "Atleta"} 💪
                </Text>
                <Text style={styles.headerSubtitle}>{motivationalQuote}</Text>
              </View>
              <View style={styles.timeContainer}>
                <Text style={styles.currentTime}>{formattedTime}</Text>
                <Text style={styles.currentDate}>
                  {currentTime.toLocaleDateString("es-ES", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </Text>
              </View>
            </View>

            {/* Quick Stats Overview */}
            <View style={styles.quickStats}>
              <View style={styles.quickStat}>
                <Text style={styles.quickStatValue}>
                  {stats ? Math.round(stats.totalDuration / 60) : 0}
                </Text>
                <Text style={styles.quickStatLabel}>Min</Text>
              </View>
              <View style={styles.quickStatDivider} />
              <View style={styles.quickStat}>
                <Text style={styles.quickStatValue}>
                  {stats ? stats.totalSessions : 0}
                </Text>
                <Text style={styles.quickStatLabel}>Sesiones</Text>
              </View>
              <View style={styles.quickStatDivider} />
              <View style={styles.quickStat}>
                <Text style={styles.quickStatValue}>
                  {stats ? Math.round(stats.totalVolume) : 0}
                </Text>
                <Text style={styles.quickStatLabel}>Kg</Text>
              </View>
            </View>
          </Animated.View>

          {/* Content with background color change */}
          <View
            style={[
              styles.contentWrapper,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            {/* Stats Section Rediseñada */}
            <View style={styles.statsSection}>
              <View style={styles.statsGrid}>
                <View
                  style={[
                    styles.statCard,
                    styles.timeCard,
                    {
                      backgroundColor: theme.card,
                      shadowColor: theme.shadowColor,
                      borderWidth: isDark ? 1 : 0,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.statIconContainer,
                      styles.timeIconContainer,
                      { backgroundColor: theme.primary + "20" },
                    ]}
                  >
                    <Text style={styles.statIcon}>⏱️</Text>
                  </View>
                  <Text style={[styles.statValue, { color: theme.text }]}>
                    {stats ? Math.round(stats.totalDuration / 60) : 0}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: theme.textSecondary }]}
                  >
                    Minutos totales
                  </Text>
                </View>

                <View
                  style={[
                    styles.statCard,
                    styles.setsCard,
                    {
                      backgroundColor: theme.card,
                      shadowColor: theme.shadowColor,
                      borderWidth: isDark ? 1 : 0,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.statIconContainer,
                      styles.setsIconContainer,
                      { backgroundColor: theme.success + "20" },
                    ]}
                  >
                    <Text style={styles.statIcon}>📊</Text>
                  </View>
                  <Text style={[styles.statValue, { color: theme.text }]}>
                    {stats ? stats.totalSessions : 0}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: theme.textSecondary }]}
                  >
                    Sesiones totales
                  </Text>
                </View>

                <View
                  style={[
                    styles.statCard,
                    styles.weightCard,
                    {
                      backgroundColor: theme.card,
                      shadowColor: theme.shadowColor,
                      borderWidth: isDark ? 1 : 0,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.statIconContainer,
                      styles.weightIconContainer,
                      { backgroundColor: theme.warning + "20" },
                    ]}
                  >
                    <Text style={styles.statIcon}>🏋️</Text>
                  </View>
                  <Text style={[styles.statValue, { color: theme.text }]}>
                    {stats ? Math.round(stats.totalVolume) : 0}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: theme.textSecondary }]}
                  >
                    Volumen
                  </Text>
                </View>
              </View>
            </View>

            {/* Acciones Rápidas */}
            <View style={styles.actionsSection}>
              <View style={styles.actionsGrid}>
                <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                  <Pressable
                    style={[
                      styles.actionButton,
                      styles.startWorkout,
                      {
                        backgroundColor: theme.card,
                        shadowColor: theme.shadowColor,
                        borderLeftColor: theme.error,
                        borderWidth: isDark ? 1 : 0,
                        borderColor: theme.border,
                        borderLeftWidth: 4,
                      },
                    ]}
                    onPress={handleStartWorkout}
                    android_ripple={{ color: theme.error + "20" }}
                  >
                    <View
                      style={[
                        styles.actionIconContainer,
                        { backgroundColor: theme.error },
                      ]}
                    >
                      <Text style={styles.actionIcon}>🔥</Text>
                    </View>
                    <View style={styles.actionTextContainer}>
                      <Text
                        style={[styles.actionButtonText, { color: theme.text }]}
                      >
                        Iniciar Entrenamiento
                      </Text>
                      <Text
                        style={[
                          styles.actionButtonSubtext,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Comienza ahora
                      </Text>
                    </View>
                    <Text
                      style={[styles.actionArrow, { color: theme.primary }]}
                    >
                      →
                    </Text>
                  </Pressable>
                </Animated.View>
              </View>
            </View>

            {/* Histórico de Sesiones */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Histórico de Sesiones
                </Text>
                <Text
                  style={[
                    styles.sectionSubtitle,
                    { color: theme.textSecondary },
                  ]}
                >
                  {sessions.length > 0
                    ? `${sessions.length} entrenamiento${
                        sessions.length > 1 ? "s" : ""
                      } registrado${sessions.length > 1 ? "s" : ""}`
                    : "Tus entrenamientos recientes"}
                </Text>
              </View>

              {sessions.length === 0 ? (
                <Animated.View
                  style={[
                    styles.emptyState,
                    {
                      backgroundColor: theme.card,
                      opacity: fadeAnim,
                      transform: [
                        {
                          translateY: fadeAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [20, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Text style={styles.emptyStateEmoji}>📊</Text>
                  <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
                    No hay sesiones registradas
                  </Text>
                  <Text
                    style={[
                      styles.emptyStateText,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Comienza tu primer entrenamiento para ver estadísticas aquí
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.emptyStateCTA,
                      { backgroundColor: theme.primary },
                    ]}
                    onPress={handleStartWorkout}
                  >
                    <Text style={styles.emptyStateCTAText}>
                      Empezar ahora 🚀
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              ) : (
                <FlatList
                  data={sessions}
                  renderItem={renderSessionCard}
                  keyExtractor={(item) => item.id}
                  numColumns={responsive.sessionColumns}
                  key={responsive.sessionColumns} // Force remount when columns change
                  scrollEnabled={false}
                  columnWrapperStyle={
                    responsive.sessionColumns === 2
                      ? styles.sessionRow
                      : undefined
                  }
                  contentContainerStyle={styles.sessionsContainer}
                />
              )}
            </View>
          </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  headerTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  headerGreeting: {
    color: "#FFFFFF",
    fontSize: RFValue(14),
    fontWeight: "600",
    marginBottom: 4,
    opacity: 0.9,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: RFValue(26),
    fontWeight: "bold",
    marginBottom: 8,
  },
  headerSubtitle: {
    color: "#E0D7F5",
    fontSize: RFValue(13),
    lineHeight: 18,
    fontWeight: "500",
    opacity: 0.9,
  },
  timeContainer: {
    alignItems: "flex-end",
  },
  currentTime: {
    color: "#FFFFFF",
    fontSize: RFValue(18),
    fontWeight: "bold",
    marginBottom: 2,
  },
  currentDate: {
    color: "#E0D7F5",
    fontSize: RFValue(12),
    fontWeight: "500",
    textTransform: "capitalize",
  },
  quickStats: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
  },
  quickStat: {
    flex: 1,
    alignItems: "center",
  },
  quickStatValue: {
    color: "#FFFFFF",
    fontSize: RFValue(20),
    fontWeight: "bold",
    marginBottom: 4,
  },
  quickStatLabel: {
    color: "#E0D7F5",
    fontSize: RFValue(12),
    fontWeight: "600",
  },
  quickStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  statsSection: {
    paddingHorizontal: 20,
    marginTop: -15,
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  statCard: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
  },
  timeCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#6C3BAA",
  },
  setsCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#10B981",
  },
  weightCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  timeIconContainer: {},
  setsIconContainer: {},
  weightIconContainer: {},
  statIcon: {
    fontSize: RFValue(18),
  },
  statValue: {
    fontSize: RFValue(20),
    fontWeight: "bold",
    marginBottom: 4,
    flexShrink: 1,
    textAlign: "center",
  },
  statLabel: {
    fontSize: RFValue(11),
    fontWeight: "600",
    textAlign: "center",
    flexShrink: 1,
  },
  actionsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  actionsGrid: {
    gap: 16,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 20,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  startWorkout: {
    borderLeftWidth: 4,
  },
  actionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  actionIcon: {
    fontSize: RFValue(20),
    color: "#FFFFFF",
  },
  actionTextContainer: {
    flex: 1,
  },
  actionButtonText: {
    fontSize: RFValue(18),
    fontWeight: "bold",
    marginBottom: 4,
  },
  actionButtonSubtext: {
    fontSize: RFValue(12),
    fontWeight: "500",
  },
  actionArrow: {
    fontSize: RFValue(20),
    fontWeight: "bold",
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: RFValue(20),
    fontWeight: "bold",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: RFValue(14),
  },
  sessionCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sessionHeader: {
    marginBottom: 12,
  },
  sessionDateContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  sessionDateIcon: {
    marginRight: 6,
  },
  sessionDate: {
    fontSize: RFValue(12),
    textTransform: "capitalize",
  },
  sessionTitle: {
    fontSize: RFValue(16),
    fontWeight: "600",
  },
  sessionStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  sessionStat: {
    flexDirection: "row",
    alignItems: "center",
  },
  sessionStatIcon: {
    marginRight: 6,
  },
  sessionStatText: {
    fontSize: RFValue(14),
    fontWeight: "500",
  },
  exercisesSection: {
    borderTopWidth: 1,
    paddingTop: 12,
  },
  exercisesTitle: {
    fontSize: RFValue(14),
    fontWeight: "600",
    marginBottom: 8,
  },
  exercisesList: {
    gap: 8,
  },
  exerciseItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  exerciseImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: RFValue(14),
    fontWeight: "500",
    marginBottom: 2,
  },
  exerciseSets: {
    fontSize: RFValue(12),
  },
  moreExercises: {
    paddingLeft: 52,
  },
  moreExercisesText: {
    fontSize: RFValue(12),
    fontWeight: "500",
  },
  emptyState: {
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
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: RFValue(14),
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyStateCTA: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyStateCTAText: {
    color: "#FFFFFF",
    fontSize: RFValue(16),
    fontWeight: "700",
  },
  fullScreenLoading: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  fullScreenLoadingText: {
    fontSize: RFValue(14),
    fontWeight: "600",
  },
  sessionRow: {
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  sessionsContainer: {
    gap: 12,
  },
});
