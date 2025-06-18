import React, { useState, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import ExerciseCard, { SetData } from "../components/ExerciseCard";
import { WorkoutStackParamList } from "./WorkoutStack";
import { RouteProp, useRoute } from "@react-navigation/native";

type RoutineDetailRouteProp = RouteProp<WorkoutStackParamList, "RoutineDetail">;

export default function RoutineDetailScreen() {
  const route = useRoute<RoutineDetailRouteProp>();
  const { routine } = route.params;

  const [started, setStarted] = useState(false);
  const [duration, setDuration] = useState(0); // segundos
  const [sets, setSets] = useState<SetData[]>([
    { id: "1", label: "1", kg: 80, reps: 10, completed: true },
    { id: "2", label: "2", kg: 85, reps: 8, completed: true },
    { id: "3", label: "3", kg: 90, reps: 6, completed: false },
    { id: "4", label: "4", kg: 90, reps: 6, completed: false },
  ]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (started) {
      interval = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [started]);

  const volume = sets.reduce(
    (sum, s) => (s.completed ? sum + s.kg * s.reps : sum),
    0
  );
  const completedSets = sets.filter((s) => s.completed).length;

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (totalSeconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const handleFinishRoutine = () => {
    setStarted(false);
    setDuration(0);
    setSets((prevSets) =>
      prevSets.map((set) => ({ ...set, completed: false }))
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {started && (
        <View style={styles.fixedHeader}>
          <View style={styles.trainingHeader}>
            <Text style={styles.metricsTitle}>Entrenando</Text>
            <TouchableOpacity onPress={handleFinishRoutine}>
              <Text style={styles.finishButton}>Terminar</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.metrics}>
            <Text style={styles.metricText}>⏱ {formatTime(duration)}</Text>
            <Text style={styles.metricText}>🏋️{volume} kg</Text>
            <Text style={styles.metricText}>✅ {completedSets}</Text>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingTop: started ? 100 : 0 }}
      >
        <View style={styles.header}>
          {!started ? (
            <>
              <Text style={styles.title}>{routine.name}</Text>
              <TouchableOpacity
                style={styles.startButton}
                onPress={() => setStarted(true)}
              >
                <Text style={styles.startButtonText}>Iniciar Rutina</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>

        <ExerciseCard
          title={routine.name}
          initialSets={sets}
          onChangeSets={(updatedSets: SetData[]) => setSets(updatedSets)}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f9fafb",
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#6C3BAA",
    marginBottom: 12,
  },
  startButton: {
    backgroundColor: "#6C3BAA",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  startButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  trainingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  metricsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#6C3BAA",
  },
  finishButton: {
    fontSize: 14,
    color: "#6C3BAA",
    fontWeight: "bold",
  },
  metrics: {
    flexDirection: "row", // Coloca los elementos en una fila
    justifyContent: "space-around", // Espacia los elementos uniformemente
    alignItems: "center", // Centra los elementos verticalmente
    backgroundColor: "#fff", // Fondo blanco para destacar
    paddingVertical: 8, // Espaciado vertical
    elevation: 4, // Sombra para destacar la sección
    borderBottomWidth: 1, // Línea inferior para separación visual
    borderBottomColor: "#ddd", // Color de la línea inferior
  },
  metricText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "bold",
  },
  fixedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "#f9fafb",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
});
