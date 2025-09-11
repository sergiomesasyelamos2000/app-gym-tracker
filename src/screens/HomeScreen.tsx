import React, { useEffect, useState, useCallback } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
} from "react-native";
import {
  findAllRoutineSessions,
  findRoutineSessions,
  getGlobalStats,
} from "../features/routine/services/routineService";
import { formatTime } from "../features/routine/utils/routineHelpers";

export default function HomeScreen() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Función para cargar datos
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

  // Cargar datos al montar el componente
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Función para el pull-to-refresh
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
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>¡Hola, Atleta! 💪</Text>
          <Text style={styles.headerSubtitle}>
            Listo para otro día de progreso
          </Text>
        </View>

        {/* Stats Section */}
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
              <View key={s.id} style={styles.historyItem}>
                <Text style={styles.historyText}>
                  📅 {new Date(s.createdAt).toLocaleDateString()}
                </Text>
                <Text style={styles.historyText}>
                  ⏱ {formatTime(s.totalTime)} • 🏋️ {s.totalWeight} kg • ✅{" "}
                  {s.completedSets}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Action Section */}
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
    backgroundColor: "#6C3BAA", // morado corporativo
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
    backgroundColor: "#ede7f6", // lila claro
  },
  lavenderCard: {
    backgroundColor: "#f3e8ff", // más suave
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
  historyContainer: {
    marginTop: 20,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#6C3BAA",
  },
  historyItem: {
    marginBottom: 10,
  },
  historyText: {
    fontSize: 14,
    color: "#333",
  },
  noSessionsText: {
    textAlign: "center",
    color: "#888",
    fontStyle: "italic",
    marginVertical: 16,
  },
});
