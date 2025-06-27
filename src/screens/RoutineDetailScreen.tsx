import { RouteProp, useRoute } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import uuid from "react-native-uuid";
import ExerciseCard, { SetData } from "../components/ExerciseCard";
import { ExerciseRequestDto } from "../models";
import { saveRoutine } from "../services/routineService";
import { WorkoutStackParamList } from "./WorkoutStack";

type RoutineDetailRouteProp = RouteProp<WorkoutStackParamList, "RoutineDetail">;

export default function RoutineDetailScreen() {
  const route = useRoute<RoutineDetailRouteProp>();
  const { routine, exercises } = route.params;
  const [routineTitle, setRoutineTitle] = useState(routine?.title || "");
  const [exercisesState, setExercises] = useState(
    exercises || routine?.exercises || []
  );
  const exerciseList = routine?.exercises || exercisesState || [];

  console.log("RoutineDetailScreen - routine:", routine, exercises);

  const [started, setStarted] = useState(false);
  const [duration, setDuration] = useState(0); // segundos
  const [sets, setSets] = useState<{ [exerciseId: string]: SetData[] }>(
    exerciseList.reduce((acc, exercise) => {
      acc[exercise.id] = [
        {
          id: uuid.v4() as string,
          order: 1,
          weight: 0,
          reps: 0,
          completed: false,
        },
      ];
      return acc;
    }, {} as { [exerciseId: string]: SetData[] })
  );

  const handleSaveRoutine = async () => {
    try {
      const routineData = {
        id: routine?.id || (uuid.v4() as string),
        title: routine?.title ?? routineTitle,
        totalTime: routine?.totalTime || 0,
        totalWeight: routine?.totalWeight || 0,
        completedSets: routine?.completedSets || 0,
        createdAt: routine?.createdAt
          ? new Date(routine.createdAt)
          : new Date(),
        exercises: exerciseList.map((exercise) => ({
          ...exercise,
          sets: sets[exercise.id] || [],
        })),
      };
      await saveRoutine(routineData);
      alert("Rutina guardada exitosamente");
    } catch (error) {
      console.error("Error al guardar la rutina:", error);
      alert("Error al guardar la rutina");
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (started) {
      interval = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [started]);

  const allSets = Object.values(sets).flat();
  const volume = allSets.reduce(
    (sum, s) => (s.completed ? sum + (s?.weight ?? 0) * (s?.reps ?? 0) : sum),
    0
  );
  const completedSets = allSets.filter((s) => s.completed).length;

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
    setSets((prevSets) => {
      const resetSets: { [exerciseId: string]: SetData[] } = {};
      Object.keys(prevSets).forEach((exerciseId) => {
        resetSets[exerciseId] = prevSets[exerciseId].map((set) => ({
          ...set,
          completed: false,
        }));
      });
      return resetSets;
    });
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {!started && routine?.id && (
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
      {!routine?.id && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.titleInput}
            placeholder="Introduce el nombre de la rutina"
            value={routineTitle}
            onChangeText={setRoutineTitle}
          />
        </View>
      )}
    </View>
  );

  const renderExerciseCard = ({ item }: { item: ExerciseRequestDto }) => (
    <ExerciseCard
      exercise={item}
      initialSets={sets[item.id] || []}
      onChangeSets={(updatedSets: SetData[]) =>
        setSets((prev) => ({ ...prev, [item.id]: updatedSets }))
      }
      onChangeExercise={(updatedExercise: ExerciseRequestDto) => {
        setExercises((prev) =>
          prev.map((exercise) =>
            exercise.id === updatedExercise.id ? updatedExercise : exercise
          )
        );
      }}
    />
  );

  return (
    <SafeAreaView style={styles.safeArea}>
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
      {!routine?.id && (
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveRoutine}>
          <Text style={styles.saveButtonText}>Guardar Rutina</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  inputContainer: {
    marginTop: 20,
  },
  titleInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    elevation: 2,
    fontSize: 16,
    color: "#333",
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
  saveButton: {
    backgroundColor: "#6C3BAA",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    margin: 16,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
