import React, { useState, useEffect } from "react";
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import ExerciseCard, { SetData } from "../components/ExerciseCard";
import { WorkoutStackParamList } from "./WorkoutStack";
import { RouteProp, useRoute } from "@react-navigation/native";
import { ExerciseDto } from "../services/exerciseService";

type RoutineDetailRouteProp = RouteProp<WorkoutStackParamList, "RoutineDetail">;

export default function RoutineDetailScreen() {
  const route = useRoute<RoutineDetailRouteProp>();
  const { routine, exercises } = route.params;
  const exerciseList = routine?.exercises || exercises || [];

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

  const renderHeader = () => (
    <View style={styles.header}>
      {!started && (
        <>
          <Text style={styles.title}>{routine?.title}</Text>
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => setStarted(true)}
          >
            <Text style={styles.startButtonText}>Iniciar Rutina</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const renderExerciseCard = ({ item }: { item: ExerciseDto }) => (
    <ExerciseCard
      exercise={item}
      initialSets={sets}
      onChangeSets={(updatedSets: SetData[]) => setSets(updatedSets)}
    />
  );

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
            <Text style={styles.metricText}>🏋️ {volume} kg</Text>
            <Text style={styles.metricText}>✅ {completedSets}</Text>
          </View>
        </View>
      )}

      <FlatList
        data={exerciseList}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        renderItem={renderExerciseCard}
        contentContainerStyle={{ paddingTop: started ? 100 : 0, padding: 16 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 8,
    elevation: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
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
