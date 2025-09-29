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
} from "react-native";
import {
  findAllRoutineSessions,
  getGlobalStats,
} from "../features/routine/services/routineService";
import { formatTime } from "../features/routine/utils/routineHelpers";
import { ExerciseRequestDto } from "../models";

// Función auxiliar para formatear la URI de la imagen
// Replace your getImageSource function with this:
const getImageSource = (exercise: ExerciseRequestDto) => {
  // Check if imageUrl exists and appears to be base64 data
  if (exercise.imageUrl) {
    // If it's raw base64 data without the data URI scheme
    if (
      exercise.imageUrl.startsWith("/9j/") ||
      exercise.imageUrl.startsWith("iVBORw")
    ) {
      return { uri: `data:image/jpeg;base64,${exercise.imageUrl}` };
    }
    // If it already has a proper data URI scheme or HTTP URL
    return { uri: exercise.imageUrl };
  }

  // Fallback to giftUrl if no imageUrl
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
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerBackground}>
            <Text style={styles.headerTitle}>¡Hola, Atleta! 💪</Text>
            <Text style={styles.headerSubtitle}>
              Listo para otro día de progreso
            </Text>
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <Text style={styles.statsTitle}></Text>
          <View style={styles.statsGrid}>
            {/* Tiempo Total */}
            <View style={[styles.statCard, styles.timeCard]}>
              <View style={styles.statHeader}>
                <View style={[styles.statIcon, styles.timeIcon]}>
                  <Text style={styles.statIconText}>⏱️</Text>
                </View>
                <Text style={styles.statValue}>
                  {stats ? Math.round(stats.totalTime / 60) : 0}
                </Text>
              </View>
              <Text style={styles.statLabel}>Minutos totales</Text>
            </View>

            {/* Series Completadas */}
            <View style={[styles.statCard, styles.setsCard]}>
              <View style={styles.statHeader}>
                <View style={[styles.statIcon, styles.setsIcon]}>
                  <Text style={styles.statIconText}>✅</Text>
                </View>
                <Text style={styles.statValue}>
                  {stats ? stats.completedSets : 0}
                </Text>
              </View>
              <Text style={styles.statLabel}>Series completadas</Text>
            </View>

            {/* Peso Movido */}
            <View style={[styles.statCard, styles.weightCard]}>
              <View style={styles.statHeader}>
                <View style={[styles.statIcon, styles.weightIcon]}>
                  <Text style={styles.statIconText}>🏋️</Text>
                </View>
                <Text style={styles.statValue}>
                  {stats ? stats.totalWeight : 0}
                </Text>
              </View>
              <Text style={styles.statLabel}>Kg movidos</Text>
            </View>
          </View>
        </View>

        {/* Histórico de Sesiones */}
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

        {/* Acciones Rápidas */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryAction]}
            >
              <Text style={styles.actionButtonIcon}>🔥</Text>
              <Text style={styles.actionButtonText}>Iniciar Entrenamiento</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryAction]}
            >
              <Text style={styles.actionButtonIcon}>📈</Text>
              <Text style={styles.actionButtonText}>Ver Progreso</Text>
            </TouchableOpacity>
          </View>
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
  // Header Styles
  header: {
    backgroundColor: "#6C3BAA",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 30,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  headerBackground: {
    alignItems: "flex-start",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    color: "#E0D7F5",
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "500",
  },

  // Stats Section
  statsSection: {
    paddingHorizontal: 20,
    marginTop: -25,
    marginBottom: 24,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 16,
    textAlign: "center",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },

  // Stat Cards
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    minHeight: 110,
    justifyContent: "space-between",
  },
  timeCard: {
    borderTopWidth: 4,
    borderTopColor: "#6C3BAA",
  },
  setsCard: {
    borderTopWidth: 4,
    borderTopColor: "#10B981",
  },
  weightCard: {
    borderTopWidth: 4,
    borderTopColor: "#F59E0B",
  },

  // Stat Content
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  timeIcon: {
    backgroundColor: "#6C3BAA20",
  },
  setsIcon: {
    backgroundColor: "#10B98120",
  },
  weightIcon: {
    backgroundColor: "#F59E0B20",
  },
  statIconText: {
    fontSize: 16,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1E293B",
    textAlign: "right",
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
    textAlign: "center",
    marginTop: 4,
  },

  // Sections
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
  // Session Cards
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
  // Exercises
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
  placeholderEmoji: {
    fontSize: 16,
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
    paddingLeft: 52, // Align with other exercises
  },
  moreExercisesText: {
    fontSize: 12,
    color: "#6C3BAA",
    fontWeight: "500",
  },
  // Empty State
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
  // Actions
  actionsSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  actionsGrid: {
    gap: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryAction: {
    backgroundColor: "#6C3BAA",
  },
  secondaryAction: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E2E8F0",
  },
  actionButtonIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
