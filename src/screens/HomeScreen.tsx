import React from "react";
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>¡Hola, Atleta! 💪</Text>
          <Text style={styles.headerSubtitle}>
            Listo para otro día de progreso
          </Text>
        </View>

        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.greenCard]}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Entrenamientos</Text>
          </View>
          <View style={[styles.statCard, styles.redCard]}>
            <Text style={styles.statValue}>1,847</Text>
            <Text style={styles.statLabel}>Calorías hoy</Text>
          </View>
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
    backgroundColor: "#f9fafb", // Fondo para toda la pantalla
  },
  container: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  header: {
    backgroundColor: "#4caf50",
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
    color: "#fff",
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
  greenCard: {
    backgroundColor: "#e8f5e9",
  },
  redCard: {
    backgroundColor: "#ffebee",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4caf50",
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
    backgroundColor: "#4caf50",
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
    borderColor: "#4caf50",
  },
  secondaryButtonText: {
    color: "#4caf50",
    fontSize: 16,
    fontWeight: "bold",
  },
});
