import {
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
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
import { getRoutineById, saveRoutine } from "../services/routineService";
import { WorkoutStackParamList } from "./WorkoutStack";

type RoutineDetailRouteProp = RouteProp<WorkoutStackParamList, "RoutineDetail">;

export default function RoutineDetailScreen() {
  const route = useRoute<RoutineDetailRouteProp>();
  const { routine, exercises } = route.params;
  const navigation = useNavigation<NavigationProp<WorkoutStackParamList>>();

  const [loading, setLoading] = useState(!!routine?.id);
  const [routineData, setRoutineData] = useState<any>(routine || null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [routineTitle, setRoutineTitle] = useState(routine?.title || "");
  const [started, setStarted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [exercisesState, setExercises] = useState<ExerciseRequestDto[]>([]);
  const [sets, setSets] = useState<{ [exerciseId: string]: SetData[] }>({});

  // Cargar rutina si tiene ID
  useEffect(() => {
    const fetchRoutine = async () => {
      if (routine?.id) {
        try {
          const data = await getRoutineById(routine.id);
          console.log("Fetched routine data:", data);
          setRoutineData(data);
        } catch (err) {
          console.error("Error fetching routine by id", err);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchRoutine();
  }, [routine?.id]);

  // Mapear ejercicios cuando cambia la rutina
  useEffect(() => {
    const mappedExercises: ExerciseRequestDto[] =
      exercises ||
      (routineData?.routineExercises
        ? routineData.routineExercises.map((re: any) => ({
            ...re.exercise,
            sets: re.sets || [],
            notes: re.notes,
            restSeconds: re.restSeconds,
          }))
        : routineData?.exercises || []);

    setExercises(mappedExercises);
    setRoutineTitle(routineData?.title || "");

    const initialSets: { [exerciseId: string]: SetData[] } = {};
    mappedExercises.forEach((exercise) => {
      initialSets[exercise.id] =
        exercise.sets && exercise.sets.length > 0
          ? exercise.sets.map((set: any) => ({
              ...set,
              completed:
                typeof set.completed === "boolean" ? set.completed : false,
            }))
          : [
              {
                id: uuid.v4() as string,
                order: 1,
                weight: 0,
                reps: 0,
                completed: false,
              },
            ];
    });
    setSets(initialSets);
  }, [routineData]);

  // Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (started) {
      interval = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [started]);

  const handleSaveRoutine = async () => {
    try {
      const routineToSave = {
        id: routineData?.id || (uuid.v4() as string),
        title: routineTitle,
        totalTime: duration,
        totalWeight: volume,
        completedSets,
        createdAt: routineData?.createdAt
          ? new Date(routineData.createdAt)
          : new Date(),
        exercises: exercisesState.map((exercise) => ({
          ...exercise,
          sets: sets[exercise.id] || [],
        })),
      };
      await saveRoutine(routineToSave);
      alert("Rutina guardada exitosamente");
    } catch (error) {
      console.error("Error al guardar la rutina:", error);
      alert("Error al guardar la rutina");
    }
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

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (totalSeconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const allSets = Object.values(sets).flat();
  const volume = allSets.reduce(
    (sum, s) => (s.completed ? sum + (s?.weight ?? 0) * (s?.reps ?? 0) : sum),
    0
  );
  const completedSets = allSets.filter((s) => s.completed).length;

  const renderHeader = () => (
    <View style={styles.header}>
      {!started && routineData?.id && (
        <>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{routineTitle}</Text>
          </View>
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => setStarted(true)}
          >
            <Text style={styles.startButtonText}>Iniciar Rutina</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.editLink}
            onPress={() => {
              goToEditRoutine();
            }}
          >
            <Text style={styles.editLinkText}>Editar rutina</Text>
          </TouchableOpacity>
        </>
      )}
      {!routineData?.id && (
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
      onChangeSets={(updatedSets) =>
        setSets((prev) => ({ ...prev, [item.id]: updatedSets }))
      }
      onChangeExercise={(updatedExercise) => {
        setExercises((prev) =>
          prev.map((exercise) =>
            exercise.id === updatedExercise.id ? updatedExercise : exercise
          )
        );
      }}
    />
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={{ textAlign: "center", marginTop: 40 }}>
          Cargando rutina...
        </Text>
      </SafeAreaView>
    );
  }

  const goToEditRoutine = () => {
    const exercisesForEdit = exercisesState.map((exercise) => ({
      ...exercise,
      sets: sets[exercise.id] || [],
    }));

    navigation.navigate("RoutineEdit", {
      id: routineData?.id,
      title: routineData.title,
      exercises: exercisesForEdit,
      onUpdate: (newTitle: string) => {
        console.log("Updating routine title:", newTitle);
      },
    });
  };

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
        data={exercisesState}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        renderItem={renderExerciseCard}
        contentContainerStyle={{ paddingTop: started ? 100 : 0, padding: 16 }}
      />

      {!routineData?.id && (
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
  header: {
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#6C3BAA",
    marginBottom: 12,
  },
  editLink: {
    justifyContent: "flex-start",
  },
  editLinkText: {
    color: "#6C3BAA",
    fontWeight: "bold",
    textDecorationLine: "underline",
    fontSize: 16,
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
  saveButton: {
    backgroundColor: "#6C3BAA",
    padding: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  fixedHeader: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    elevation: 3,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
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
    color: "#333",
  },
  finishButton: {
    color: "#D32F2F",
    fontWeight: "bold",
    fontSize: 16,
  },
  metrics: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 4,
  },
  metricText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#555",
  },
});
