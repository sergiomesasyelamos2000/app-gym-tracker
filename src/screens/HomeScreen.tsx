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

export default function HomeScreen() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Cargar datos
  const fetchData = useCallback(async () => {
    try {
      const globalStats = await getGlobalStats();

      setStats(globalStats);

      const sessionsData = await findAllRoutineSessions();

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
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>¡Hola, Atleta! 💪</Text>
          <Text style={styles.headerSubtitle}>
            Listo para otro día de progreso
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.purpleCard]}>
            <Text style={styles.statValue}>
              {stats ? Math.round(stats.totalTime / 60) : 0} min
            </Text>
            <Text style={styles.statLabel}>Tiempo total</Text>
          </View>
          <View style={[styles.statCard, styles.lavenderCard]}>
            <Text style={styles.statValue}>
              {stats ? stats.completedSets : 0}
            </Text>
            <Text style={styles.statLabel}>Series completadas</Text>
          </View>
          <View style={[styles.statCard, styles.purpleCard]}>
            <Text style={styles.statValue}>
              {stats ? stats.totalWeight : 0} kg
            </Text>
            <Text style={styles.statLabel}>Peso movido</Text>
          </View>
        </View>

        {/* Histórico */}
        <View style={styles.historyContainer}>
          <Text style={styles.historyTitle}>Histórico</Text>
          {sessions.length === 0 ? (
            <Text style={styles.noSessionsText}>
              No hay sesiones registradas.
            </Text>
          ) : (
            sessions.map((s) => (
              <View key={s.id} style={styles.sessionCard}>
                {/* Fecha y Título */}
                <Text style={styles.sessionDate}>
                  📅 {new Date(s.createdAt).toLocaleDateString()}
                </Text>
                <Text style={styles.sessionTitle}>{s.routine?.title}</Text>

                {/* Tiempo y Volumen */}
                <Text style={styles.sessionInfo}>
                  ⏱ {formatTime(s.totalTime)} • 🏋️ {s.totalWeight} kg • ✅{" "}
                  {s.completedSets} series
                </Text>

                {/* Ejercicios */}
                <View style={styles.exercisesPreview}>
                  {s.routine?.routineExercises?.slice(0, 3).map((re: any) => (
                    <View key={re.id} style={styles.exerciseRow}>
                      <Image
                        source={{
                          uri: re.exercise.imageUrl || re.exercise.giftUrl,
                        }}
                        style={styles.exerciseImage}
                      />
                      <Text style={styles.exerciseText}>
                        {re.sets?.length || 0}x {re.exercise.name}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Acciones */}
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Iniciar Entrenamiento</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
          >
            <Text style={styles.secondaryButtonText}>Ver Progreso</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  container: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  header: {
    backgroundColor: "#6C3BAA",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  headerSubtitle: {
    color: "#E0D7F5",
    fontSize: 16,
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 8,
    alignItems: "center",
  },
  purpleCard: {
    backgroundColor: "#ede7f6",
  },
  lavenderCard: {
    backgroundColor: "#f3e8ff",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#6C3BAA",
  },
  statLabel: {
    fontSize: 14,
    color: "#757575",
    marginTop: 4,
  },
  historyContainer: {
    marginTop: 20,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#6C3BAA",
  },
  sessionCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  sessionDate: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  sessionInfo: {
    fontSize: 14,
    color: "#555",
    marginBottom: 8,
  },
  exercisesPreview: {
    marginTop: 4,
  },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  exerciseImage: {
    width: 32,
    height: 32,
    borderRadius: 6,
    marginRight: 8,
    backgroundColor: "#eee",
  },
  exerciseText: {
    fontSize: 14,
    color: "#333",
  },
  actionContainer: {
    marginTop: 16,
  },
  actionButton: {
    backgroundColor: "#6C3BAA",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#6C3BAA",
  },
  secondaryButtonText: {
    color: "#6C3BAA",
    fontSize: 16,
    fontWeight: "bold",
  },
  noSessionsText: {
    textAlign: "center",
    color: "#888",
    fontStyle: "italic",
    marginVertical: 16,
  },
});
