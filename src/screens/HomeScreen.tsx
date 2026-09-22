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
import type { ExerciseRequestDto, SetRequestDto } from "@sergiomesasyelamos2000/shared";
import CachedExerciseImage from "../components/CachedExerciseImage";
import { getExerciseThumbnailUrl } from "../features/routine/utils/normalizeExerciseImage";
import LiveClock from "../components/LiveClock";
import { useTheme } from "../contexts/ThemeContext";
import type { WorkoutStackParamList } from "../features/routine/screens/WorkoutStack";
import {
  findAllRoutineSessions,
  getRoutineById,
} from "../features/routine/services/routineService";
import { useResponsive } from "../hooks/useResponsive";
import { useAuthStore } from "../store/useAuthStore";

// Types for session exercises (from backend)
interface SessionExercise {
  exerciseId: string;
  name: string;
  imageUrl?: string;
  giftUrl?: string;
  restSeconds?: string;
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
  restSeconds?: string;
  exercise?: {
    id?: string;
    name?: string;
    imageUrl?: string;
    giftUrl?: string;
    gifUrl?: string;
    image?: string;
    restSeconds?: string;
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

type WeeklyStats = {
  sessions: number;
  durationSeconds: number;
  volumeKg: number;
};

const toSafeNumber = (value: unknown): number => {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;

  return Number.isFinite(parsed) ? parsed : 0;
};

/** Monday 00:00 local time for the calendar week containing `date`. */
const getStartOfWeek = (date: Date = new Date()): Date => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay(); // 0 Sun … 6 Sat
  const daysFromMonday = day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - daysFromMonday);
  return start;
};

const computeWeeklyStats = (sessions: SessionWithTotals[]): WeeklyStats => {
  const weekStart = getStartOfWeek();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  return sessions.reduce<WeeklyStats>(
    (acc, session) => {
      const created = new Date(session.createdAt);
      if (created < weekStart || created >= weekEnd) return acc;
      return {
        sessions: acc.sessions + 1,
        durationSeconds: acc.durationSeconds + toSafeNumber(session.totalTime),
        volumeKg: acc.volumeKg + toSafeNumber(session.totalWeight),
      };
    },
    { sessions: 0, durationSeconds: 0, volumeKg: 0 }
  );
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

/** Compact duration for the home weekly strip. */
const formatWeeklyDuration = (totalSeconds: number): string => {
  const safeSeconds = Math.max(0, toSafeNumber(totalSeconds));
  const totalMinutes = Math.floor(safeSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes}`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

const formatWeeklyVolume = (kg: number): string => {
  const n = Math.round(toSafeNumber(kg));
  if (n >= 1000) {
    const compact = n / 1000;
    const text =
      compact >= 10 ? compact.toFixed(0) : compact.toFixed(1).replace(/\.0$/, "");
    return `${text}k`;
  }
  return `${n}`;
};

const weeklyDurationUnit = (totalSeconds: number): string => {
  const totalMinutes = Math.floor(Math.max(0, toSafeNumber(totalSeconds)) / 60);
  return totalMinutes < 60 ? "Min" : "Tiempo";
};

const formatSessionDateLabel = (createdAt: Date | string): string => {
  const date = new Date(createdAt);
  return date.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const formatSessionTitle = (
  routineTitle: string | undefined,
  createdAt: Date | string
): string => {
  if (routineTitle && routineTitle.trim().length > 0) {
    return routineTitle;
  }

  const date = new Date(createdAt);
  return `Sesion del ${date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })}`;
};

const normalizeSessionExercise = (
  exercise: RawSessionExercise,
  index: number
): SessionExercise => {
  const rawImageUrl =
    exercise.imageUrl ||
    exercise.exercise?.imageUrl ||
    exercise.image ||
    exercise.exercise?.image;

  const giftUrl =
    exercise.giftUrl ||
    exercise.gifUrl ||
    exercise.exercise?.giftUrl ||
    exercise.exercise?.gifUrl;

  const thumbnail = getExerciseThumbnailUrl({
    imageUrl: rawImageUrl,
    giftUrl,
  });

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
    // Keep a displayable thumbnail URI for the summary (static preferred).
    imageUrl: thumbnail.uri || rawImageUrl,
    giftUrl,
    restSeconds: exercise.restSeconds || exercise.exercise?.restSeconds,
    sets: (exercise.sets || []).map((set) => ({
      weight: toSafeNumber(set.weight),
      reps: toSafeNumber(set.reps),
      completed: Boolean(set.completed),
      isRecord: Boolean(set.isRecord),
    })),
  };
};

const countCompletedSets = (exercise: SessionExercise): number =>
  (exercise.sets || []).filter((set) => set.completed).length;

const mapSessionExercisesToRoutineExercises = (
  exercises: SessionExercise[] = []
): ExerciseRequestDto[] =>
  exercises.map((exercise, exerciseIndex) => {
    const thumbnail = getExerciseThumbnailUrl(exercise);
    return {
      id: exercise.exerciseId || `session-exercise-${exerciseIndex}`,
      name: exercise.name,
      imageUrl: thumbnail.uri || exercise.imageUrl,
      giftUrl: exercise.giftUrl,
      restSeconds: exercise.restSeconds,
      sets: (exercise.sets || []).map(
        (set, setIndex): SetRequestDto => ({
          id: `${exercise.exerciseId || `session-exercise-${exerciseIndex}`}-set-${setIndex + 1}`,
          order: setIndex + 1,
          weight: toSafeNumber(set.weight),
          reps: toSafeNumber(set.reps),
          completed: Boolean(set.completed),
        })
      ),
      weightUnit: "kg",
      repsType: "reps",
    };
  });

// Componente para mostrar la imagen del ejercicio con manejo de errores
const ExerciseImage = ({
  exercise,
  style,
}: {
  exercise: SessionExercise;
  style: StyleProp<ImageStyle>;
}) => {
  const thumbnail = getExerciseThumbnailUrl(exercise);
  return (
    <CachedExerciseImage
      imageUrl={thumbnail.uri}
      allowAnimated={thumbnail.allowAnimated}
      style={style}
    />
  );
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

const MOTIVATIONAL_QUOTES = [
  "El único límite es tu mente",
  "Cada repetición te acerca a tu meta",
  "La disciplina supera al talento",
  "Hoy es un buen día para ser mejor",
  "Tu cuerpo puede lograr lo que tu mente cree",
] as const;

const pickMotivationalQuote = () =>
  MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];

const getGreetingForDate = (date: Date): string => {
  const currentHour = date.getHours();
  if (currentHour < 12) return "¡Buenos días! ☀️";
  if (currentHour < 20) return "¡Buenas tardes! 🌤️";
  return "¡Buenas noches! 🌙";
};

export default function HomeScreen() {
  const [sessions, setSessions] = useState<SessionWithTotals[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSessionIds, setExpandedSessionIds] = useState<Set<string>>(
    new Set()
  );
  const [greeting, setGreeting] = useState(() => getGreetingForDate(new Date()));
  const [motivationalQuote, setMotivationalQuote] = useState(
    () => pickMotivationalQuote()
  );
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

  const weeklyStats = useMemo(() => computeWeeklyStats(sessions), [sessions]);
  const weeklyDurationLabel = weeklyDurationUnit(weeklyStats.durationSeconds);

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

  // Greeting only needs period-of-day checks — not a 1Hz clock on HomeScreen.
  useFocusEffect(
    useCallback(() => {
      const syncGreeting = () => {
        const nextGreeting = getGreetingForDate(new Date());
        setGreeting((prev) => {
          if (prev !== nextGreeting) {
            setMotivationalQuote(pickMotivationalQuote());
          }
          return nextGreeting;
        });
      };

      syncGreeting();
      const timer = setInterval(syncGreeting, 60_000);
      return () => clearInterval(timer);
    }, [])
  );

  useEffect(() => {
    if (!initialLoading && welcomeMessage) {
      Alert.alert("¡Bienvenido!", welcomeMessage);
      clearWelcomeMessage();
    }
  }, [initialLoading, welcomeMessage, clearWelcomeMessage]);

  // Cargar datos
  const fetchData = useCallback(async () => {
    if (!user?.id) {
      setInitialLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const sessionsData = await findAllRoutineSessions();

      const sessionsWithTotals = sessionsData.map(
        (session): SessionWithTotals => {
          const sessionExercises: SessionExercise[] = (
            (session.exercises as RawSessionExercise[] | undefined) || []
          ).map((exercise, index) => normalizeSessionExercise(exercise, index));

          const calculatedWeight =
            sessionExercises.reduce(
              (sum: number, e) =>
                sum +
                (e.sets || []).reduce((acc: number, s) => {
                  if (!s.completed) return acc;
                  return (
                    acc +
                    toSafeNumber((s as { weight?: unknown }).weight) *
                      toSafeNumber((s as { reps?: unknown }).reps)
                  );
                }, 0),
              0
            ) || 0;

          const totalReps =
            sessionExercises.reduce((sum: number, e) => {
              const exerciseTotalReps = (e.sets || []).reduce((acc: number, s) => {
                if (!s.completed) return acc;
                return acc + toSafeNumber((s as { reps?: unknown }).reps);
              }, 0);
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
            exercises: sessionExercises,
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

  const openSessionDetail = useCallback(
    async (session: SessionWithTotals) => {
      let exercises = session.exercises || [];
      const needsRestFallback = exercises.some((ex) => !ex.restSeconds);
      const routineId = session.routine?.id;

      if (needsRestFallback && routineId) {
        try {
          const routine = await getRoutineById(routineId);
          const restByExerciseId = new Map(
            (routine.routineExercises || []).map((re) => [
              re.exercise?.id || re.id,
              re.restSeconds,
            ])
          );
          exercises = exercises.map((ex) => ({
            ...ex,
            restSeconds:
              ex.restSeconds || restByExerciseId.get(ex.exerciseId) || undefined,
          }));
        } catch {
          // Keep session exercises as-is if routine lookup fails.
        }
      }

      navigation.navigate("Entreno", {
        screen: "RoutineDetail",
        params: {
          exercises: mapSessionExercisesToRoutineExercises(exercises),
          sessionView: true,
          sessionTitle: formatSessionTitle(
            session.routine?.title,
            session.createdAt
          ),
          sessionDateLabel: formatSessionDateLabel(session.createdAt),
        },
      });
    },
    [navigation]
  );

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
          onPress={() => openSessionDetail(session)}
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
                Ejercicios:
              </Text>
              <View style={styles.exercisesList}>
                {visibleExercises.map((exercise: SessionExercise) => {
                  const completedSetsCount = countCompletedSets(exercise);
                  const totalSetsCount = exercise.sets?.length || 0;
                  return (
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
                        {completedSetsCount}/{totalSetsCount} series
                      </Text>
                    </View>
                  </View>
                  );
                })}
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
    [
      theme,
      isDark,
      responsive,
      expandedSessionIds,
      toggleSessionExpanded,
      openSessionDetail,
    ]
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
              <LiveClock
                containerStyle={styles.timeContainer}
                timeStyle={styles.currentTime}
                dateStyle={styles.currentDate}
              />
            </View>

            {/* Weekly stats overview */}
            <View style={styles.quickStats}>
              <Text style={styles.quickStatsPeriod}>Esta semana</Text>
              <View style={styles.quickStatsRow}>
                <View style={styles.quickStat}>
                  <Text style={styles.quickStatValue}>
                    {formatWeeklyDuration(weeklyStats.durationSeconds)}
                  </Text>
                  <Text style={styles.quickStatLabel}>{weeklyDurationLabel}</Text>
                </View>
                <View style={styles.quickStatDivider} />
                <View style={styles.quickStat}>
                  <Text style={styles.quickStatValue}>{weeklyStats.sessions}</Text>
                  <Text style={styles.quickStatLabel}>Sesiones</Text>
                </View>
                <View style={styles.quickStatDivider} />
                <View style={styles.quickStat}>
                  <Text style={styles.quickStatValue}>
                    {formatWeeklyVolume(weeklyStats.volumeKg)}
                  </Text>
                  <Text style={styles.quickStatLabel}>Kg</Text>
                </View>
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
            {/* Acciones Rápidas */}
            <View style={[styles.actionsSection, styles.actionsSectionAfterHeader]}>
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
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 20,
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  quickStatsPeriod: {
    color: "#E0D7F5",
    fontSize: RFValue(11),
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    textAlign: "center",
    marginBottom: 10,
    opacity: 0.95,
  },
  quickStatsRow: {
    flexDirection: "row",
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
  actionsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  actionsSectionAfterHeader: {
    marginTop: 20,
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
