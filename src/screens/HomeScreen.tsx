import React, { useEffect, useState, useCallback } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  Image,
  Animated,
} from "react-native";
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
  const imageSource = getImageSource(exercise);

  if (!imageSource || imageError) {
    return <View style={[style, styles.exercisePlaceholder]}></View>;
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

export default function HomeScreen() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const fadeAnim = useState(new Animated.Value(0))[0];

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

  // Cargar datos
  const fetchData = useCallback(async () => {
    try {
      const [globalStats, sessionsData] = await Promise.all([
        getGlobalStats(),
        findAllRoutineSessions(),
      ]);

      setStats(globalStats);
      setSessions(sessionsData);
    } catch (error) {
      console.error("Error fetching data", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "¡Buenos días! ☀️";
    if (hour < 18) return "¡Buenas tardes! 🌤️";
    return "¡Buenas noches! 🌙";
  };

  const getMotivationalQuote = () => {
    const quotes = [
      "El único límite es tu mente",
      "Cada repetición te acerca a tu meta",
      "La disciplina supera al talento",
      "Hoy es un buen día para ser mejor",
      "Tu cuerpo puede lograr lo que tu mente cree",
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  };

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
        showsVerticalScrollIndicator={false}
      >
        {/* Nuevo Header Section */}
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerGreeting}>{getGreeting()}</Text>
              <Text style={styles.headerTitle}>Atleta 💪</Text>
              <Text style={styles.headerSubtitle}>
                {getMotivationalQuote()}
              </Text>
            </View>
            <View style={styles.timeContainer}>
              <Text style={styles.currentTime}>
                {currentTime.toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
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
          <Text style={styles.statsTitle}></Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, styles.timeCard]}>
              <View style={styles.statIconContainer}>
                <Text style={styles.statIcon}>⏱️</Text>
              </View>
              <Text style={styles.statValue}>
                {stats ? Math.round(stats.totalTime / 60) : 0}
              </Text>
              <Text style={styles.statLabel}>Minutos totales</Text>
            </View>

            <View style={[styles.statCard, styles.setsCard]}>
              <View style={styles.statIconContainer}>
                <Text style={styles.statIcon}>✅</Text>
              </View>
              <Text style={styles.statValue}>
                {stats ? stats.completedSets : 0}
              </Text>
              <Text style={styles.statLabel}>Series completadas</Text>
            </View>

            <View style={[styles.statCard, styles.weightCard]}>
              <View style={styles.statIconContainer}>
                <Text style={styles.statIcon}>🏋️</Text>
              </View>
              <Text style={styles.statValue}>
                {stats ? stats.totalWeight : 0}
              </Text>
              <Text style={styles.statLabel}>Kg movidos</Text>
            </View>
          </View>
        </View>

        {/* Nuevas Acciones Rápidas */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={[styles.actionButton, styles.startWorkout]}
            >
              <View style={styles.actionIconContainer}>
                <Text style={styles.actionIcon}>🔥</Text>
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionButtonText}>
                  Iniciar Entrenamiento
                </Text>
                <Text style={styles.actionButtonSubtext}>Comienza ahora</Text>
              </View>
              <Text style={styles.actionArrow}>→</Text>
            </TouchableOpacity>

            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                style={[styles.quickAction, styles.progressAction]}
              >
                <Text style={styles.quickActionIcon}>📈</Text>
                <Text style={styles.quickActionText}>Progreso</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickAction, styles.routinesAction]}
              >
                <Text style={styles.quickActionIcon}>📋</Text>
                <Text style={styles.quickActionText}>Rutinas</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickAction, styles.exercisesAction]}
              >
                <Text style={styles.quickActionIcon}>💪</Text>
                <Text style={styles.quickActionText}>Ejercicios</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickAction, styles.statsAction]}
              >
                <Text style={styles.quickActionIcon}>🏆</Text>
                <Text style={styles.quickActionText}>Estadísticas</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Histórico de Sesiones (mantenido igual) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Histórico de Sesiones</Text>
            <Text style={styles.sectionSubtitle}>
              Tus entrenamientos recientes
            </Text>
          </View>

          {sessions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateEmoji}>📊</Text>
              <Text style={styles.emptyStateTitle}>
                No hay sesiones registradas
              </Text>
              <Text style={styles.emptyStateText}>
                Comienza tu primer entrenamiento para ver estadísticas aquí
              </Text>
            </View>
          ) : (
            sessions.map((session) => (
              <View key={session.id} style={styles.sessionCard}>
                <View style={styles.sessionHeader}>
                  <View style={styles.sessionDateContainer}>
                    <Text style={styles.sessionDateIcon}>📅</Text>
                    <Text style={styles.sessionDate}>
                      {new Date(session.createdAt).toLocaleDateString("es-ES", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </Text>
                  </View>
                  <Text style={styles.sessionTitle}>
                    {session.routine?.title || "Entrenamiento sin título"}
                  </Text>
                </View>

                <View style={styles.sessionStats}>
                  <View style={styles.sessionStat}>
                    <Text style={styles.sessionStatIcon}>⏱️</Text>
                    <Text style={styles.sessionStatText}>
                      {formatTime(session.totalTime)}
                    </Text>
                  </View>
                  <View style={styles.sessionStat}>
                    <Text style={styles.sessionStatIcon}>🏋️</Text>
                    <Text style={styles.sessionStatText}>
                      {session.totalWeight} kg
                    </Text>
                  </View>
                  <View style={styles.sessionStat}>
                    <Text style={styles.sessionStatIcon}>✅</Text>
                    <Text style={styles.sessionStatText}>
                      {session.completedSets} series
                    </Text>
                  </View>
                </View>

                {session.routine?.routineExercises?.length > 0 && (
                  <View style={styles.exercisesSection}>
                    <Text style={styles.exercisesTitle}>
                      Ejercicios realizados:
                    </Text>
                    <View style={styles.exercisesList}>
                      {session.routine.routineExercises
                        .slice(0, 4)
                        .map((re: any) => (
                          <View key={re.id} style={styles.exerciseItem}>
                            <ExerciseImage
                              exercise={re.exercise}
                              style={styles.exerciseImage}
                            />
                            <View style={styles.exerciseInfo}>
                              <Text
                                style={styles.exerciseName}
                                numberOfLines={1}
                              >
                                {re.exercise.name}
                              </Text>
                              <Text style={styles.exerciseSets}>
                                {re.sets?.length || 0} series
                              </Text>
                            </View>
                          </View>
                        ))}
                      {session.routine.routineExercises.length > 4 && (
                        <View style={styles.moreExercises}>
                          <Text style={styles.moreExercisesText}>
                            +{session.routine.routineExercises.length - 4} más
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
    backgroundColor: "#F8FAFC",
  },
  container: {
    flex: 1,
  },
  // Nuevo Header Styles
  header: {
    backgroundColor: "#6C3BAA",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: "#6C3BAA",
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
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    opacity: 0.9,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  headerSubtitle: {
    color: "#E0D7F5",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    opacity: 0.9,
  },
  timeContainer: {
    alignItems: "flex-end",
  },
  currentTime: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 2,
  },
  currentDate: {
    color: "#E0D7F5",
    fontSize: 12,
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
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  quickStatLabel: {
    color: "#E0D7F5",
    fontSize: 12,
    fontWeight: "600",
  },
  quickStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },

  // Stats Section Mejorada
  statsSection: {
    paddingHorizontal: 20,
    marginTop: -15,
    marginBottom: 24,
  },
  statsTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 20,
    textAlign: "center",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    alignItems: "center",
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
  timeIconContainer: {
    backgroundColor: "#6C3BAA20",
  },
  setsIconContainer: {
    backgroundColor: "#10B98120",
  },
  weightIconContainer: {
    backgroundColor: "#F59E0B20",
  },
  statIcon: {
    fontSize: 20,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
    textAlign: "center",
  },

  // Nuevas Acciones Rápidas
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
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 20,
    shadowColor: "#000",
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
    borderLeftColor: "#EF4444",
  },
  actionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  actionIcon: {
    fontSize: 20,
    color: "#FFFFFF",
  },
  actionTextContainer: {
    flex: 1,
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 4,
  },
  actionButtonSubtext: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  actionArrow: {
    fontSize: 20,
    color: "#6C3BAA",
    fontWeight: "bold",
  },
  quickActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  quickAction: {
    flex: 1,
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  progressAction: {
    borderTopWidth: 3,
    borderTopColor: "#10B981",
  },
  routinesAction: {
    borderTopWidth: 3,
    borderTopColor: "#6C3BAA",
  },
  exercisesAction: {
    borderTopWidth: 3,
    borderTopColor: "#F59E0B",
  },
  statsAction: {
    borderTopWidth: 3,
    borderTopColor: "#8B5CF6",
  },
  quickActionIcon: {
    fontSize: 20,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E293B",
    textAlign: "center",
  },

  // Resto de estilos (mantenidos del original)
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#64748B",
  },
  sessionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
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
    fontSize: 12,
    color: "#64748B",
    textTransform: "capitalize",
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
  },
  sessionStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#F8FAFC",
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
    fontSize: 14,
    color: "#475569",
    fontWeight: "500",
  },
  exercisesSection: {
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 12,
  },
  exercisesTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
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
  exercisePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1E293B",
    marginBottom: 2,
  },
  exerciseSets: {
    fontSize: 12,
    color: "#64748B",
  },
  moreExercises: {
    paddingLeft: 52,
  },
  moreExercisesText: {
    fontSize: 12,
    color: "#6C3BAA",
    fontWeight: "500",
  },
  emptyState: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
});
