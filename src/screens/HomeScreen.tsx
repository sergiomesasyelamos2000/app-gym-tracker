import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import {
  CompositeNavigationProp,
  useFocusEffect,
  useNavigation,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
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
import { useTheme } from "../contexts/ThemeContext";
import { WorkoutStackParamList } from "../features/routine/screens/WorkoutStack";
import {
  findAllRoutineSessions,
  getGlobalStats,
} from "../features/routine/services/routineService";
import { formatTime } from "../features/routine/utils/routineHelpers";
import { ExerciseRequestDto } from "../models";

// Función auxiliar para formatear la URI de la imagen
const getImageSource = (exercise: ExerciseRequestDto) => {
  if (exercise.imageUrl) {
    if (
      exercise.imageUrl.startsWith("/9j/") ||
      exercise.imageUrl.startsWith("iVBORw")
    ) {
      return { uri: `data:image/jpeg;base64,${exercise.imageUrl}` };
    }
    return { uri: exercise.imageUrl };
  }

  if (exercise.giftUrl) {
    return { uri: exercise.giftUrl };
  }

  return null;
};

// Componente para mostrar la imagen del ejercicio con manejo de errores
const ExerciseImage = ({ exercise, style }: { exercise: any; style: any }) => {
  const [imageError, setImageError] = useState(false);
  const { theme } = useTheme();
  const imageSource = getImageSource(exercise);

  if (!imageSource || imageError) {
    return <View style={[style, { backgroundColor: theme.border }]}></View>;
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

type BottomTabsParamList = {
  Inicio: undefined;
  Login: undefined;
  Entreno: undefined | { screen?: keyof WorkoutStackParamList; params?: any };
  Nutrición: undefined;
  Macros: undefined;
};

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<BottomTabsParamList, "Inicio">,
  NativeStackNavigationProp<WorkoutStackParamList>
>;

export default function HomeScreen() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [motivationalQuote, setMotivationalQuote] = useState<string>("");
  const { theme, isDark } = useTheme();

  const fadeAnim = useState(new Animated.Value(0))[0];
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const scrollViewRef = useRef<ScrollView>(null);

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

  // Actualizar hora cada minuto
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Saludo según hora
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "¡Buenos días! ☀️";
    if (hour < 20) return "¡Buenas tardes! 🌤️";
    return "¡Buenas noches! 🌙";
  };

  // Generar quote motivacional
  const generateMotivationalQuote = () => {
    const quotes = [
      "El único límite es tu mente",
      "Cada repetición te acerca a tu meta",
      "La disciplina supera al talento",
      "Hoy es un buen día para ser mejor",
      "Tu cuerpo puede lograr lo que tu mente cree",
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  };

  // Actualizar quote solo cuando cambia el saludo
  useEffect(() => {
    setMotivationalQuote(generateMotivationalQuote());
  }, [getGreeting()]);

  // Formato de hora sin segundos
  const formattedTime = currentTime.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Cargar datos
  const fetchData = useCallback(async () => {
    try {
      const [globalStats, sessionsData] = await Promise.all([
        getGlobalStats(),
        findAllRoutineSessions(),
      ]);

      const sessionsWithTotals = sessionsData.map((session) => {
        const totalWeight = session.exercises?.reduce(
          (sum: number, e: any) =>
            sum +
            e.sets.reduce(
              (acc: number, s: any) => acc + (s.weight || 0) * (s.reps || 0),
              0
            ),
          0
        );
        const totalReps = session.exercises?.reduce(
          (sum: number, e: any) => sum + e.totalReps,
          0
        );

        return {
          ...session,
          totalWeight,
          totalReps,
        };
      });

      setStats(globalStats);
      setSessions(sessionsWithTotals);
    } catch (error) {
      console.error("Error fetching data", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

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
    navigation.navigate("Entreno", {
      screen: "WorkoutList",
    });
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.backgroundSecondary }]}
    >
      <ScrollView
        ref={scrollViewRef}
        style={[
          styles.container,
          { backgroundColor: theme.backgroundSecondary },
        ]}
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
              <Text style={styles.headerGreeting}>{getGreeting()}</Text>
              <Text style={styles.headerTitle}>Atleta 💪</Text>
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
                {stats ? Math.round(stats.totalTime / 60) : 0}
              </Text>
              <Text style={styles.quickStatLabel}>Min</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStat}>
              <Text style={styles.quickStatValue}>
                {stats ? stats.completedSets : 0}
              </Text>
              <Text style={styles.quickStatLabel}>Series</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStat}>
              <Text style={styles.quickStatValue}>
                {stats ? stats.totalWeight : 0}
              </Text>
              <Text style={styles.quickStatLabel}>Kg</Text>
            </View>
          </View>
        </Animated.View>

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
                {stats ? Math.round(stats.totalTime / 60) : 0}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
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
                <Text style={styles.statIcon}>✅</Text>
              </View>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {stats ? stats.completedSets : 0}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                Series completadas
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
                {stats ? stats.totalWeight : 0}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                Volumen
              </Text>
            </View>
          </View>
        </View>

        {/* Acciones Rápidas */}
        <View style={styles.actionsSection}>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
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
                <Text style={[styles.actionButtonText, { color: theme.text }]}>
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
              <Text style={[styles.actionArrow, { color: theme.primary }]}>
                →
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Histórico de Sesiones */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Histórico de Sesiones
            </Text>
            <Text
              style={[styles.sectionSubtitle, { color: theme.textSecondary }]}
            >
              Tus entrenamientos recientes
            </Text>
          </View>

          {sessions.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.card }]}>
              <Text style={styles.emptyStateEmoji}>📊</Text>
              <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
                No hay sesiones registradas
              </Text>
              <Text
                style={[styles.emptyStateText, { color: theme.textSecondary }]}
              >
                Comienza tu primer entrenamiento para ver estadísticas aquí
              </Text>
            </View>
          ) : (
            sessions.map((session) => (
              <View
                key={session.id}
                style={[
                  styles.sessionCard,
                  {
                    backgroundColor: theme.card,
                    shadowColor: theme.shadowColor,
                    borderWidth: isDark ? 1 : 0,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={styles.sessionHeader}>
                  <View style={styles.sessionDateContainer}>
                    <Text style={styles.sessionDateIcon}>📅</Text>
                    <Text
                      style={[
                        styles.sessionDate,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {new Date(session.createdAt).toLocaleDateString("es-ES", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </Text>
                  </View>
                  <Text style={[styles.sessionTitle, { color: theme.text }]}>
                    {session.routine?.title || "Entrenamiento sin título"}
                  </Text>
                </View>

                <View
                  style={[
                    styles.sessionStats,
                    { backgroundColor: theme.background },
                  ]}
                >
                  <View style={styles.sessionStat}>
                    <Text style={styles.sessionStatIcon}>⏱️</Text>
                    <Text
                      style={[
                        styles.sessionStatText,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {formatTime(session.totalTime)}
                    </Text>
                  </View>
                  <View style={styles.sessionStat}>
                    <Text style={styles.sessionStatIcon}>🏋️</Text>
                    <Text
                      style={[
                        styles.sessionStatText,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {session.totalWeight} kg
                    </Text>
                  </View>
                  <View style={styles.sessionStat}>
                    <Text style={styles.sessionStatIcon}>✅</Text>
                    <Text
                      style={[
                        styles.sessionStatText,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {session.completedSets} series
                    </Text>
                  </View>
                </View>

                {session.exercises?.length > 0 && (
                  <View
                    style={[
                      styles.exercisesSection,
                      { borderTopColor: theme.divider },
                    ]}
                  >
                    <Text
                      style={[
                        styles.exercisesTitle,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Ejercicios realizados:
                    </Text>
                    <View style={styles.exercisesList}>
                      {session.exercises.slice(0, 4).map((exercise: any) => (
                        <View
                          key={exercise.exerciseId}
                          style={styles.exerciseItem}
                        >
                          <ExerciseImage
                            exercise={exercise}
                            style={styles.exerciseImage}
                          />
                          <View style={styles.exerciseInfo}>
                            <Text
                              style={[
                                styles.exerciseName,
                                { color: theme.text },
                              ]}
                              numberOfLines={1}
                            >
                              {exercise.name}
                            </Text>
                            <Text
                              style={[
                                styles.exerciseSets,
                                { color: theme.textSecondary },
                              ]}
                            >
                              {exercise.sets?.length || 0} series
                            </Text>
                          </View>
                        </View>
                      ))}
                      {session.exercises.length > 4 && (
                        <View style={styles.moreExercises}>
                          <Text
                            style={[
                              styles.moreExercisesText,
                              { color: theme.primary },
                            ]}
                          >
                            +{session.exercises.length - 4} más
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
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
  },
  headerGreeting: {
    color: "#FFFFFF",
    fontSize: RFValue(16),
    fontWeight: "600",
    marginBottom: 4,
    opacity: 0.9,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: RFValue(28),
    fontWeight: "bold",
    marginBottom: 8,
  },
  headerSubtitle: {
    color: "#E0D7F5",
    fontSize: RFValue(14),
    lineHeight: 20,
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
    paddingVertical: 20,
    paddingHorizontal: 10,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    alignItems: "center",
    justifyContent: "center",
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
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  timeIconContainer: {},
  setsIconContainer: {},
  weightIconContainer: {},
  statIcon: {
    fontSize: RFValue(20),
  },
  statValue: {
    fontSize: RFValue(22),
    fontWeight: "bold",
    marginBottom: 4,
    flexShrink: 1,
    textAlign: "center",
  },
  statLabel: {
    fontSize: RFValue(12),
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
  },
});
