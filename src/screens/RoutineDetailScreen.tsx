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
import { ExerciseRequestDto, SetRequestDto } from "../models";
import { getRoutineById, saveRoutine } from "../services/routineService";
import { WorkoutStackParamList } from "./WorkoutStack";
import ExerciseCard from "../components/ExerciseCard/ExerciseCard";

type RoutineDetailRouteProp = RouteProp<WorkoutStackParamList, "RoutineDetail">;

export default function RoutineDetailScreen() {
  const route = useRoute<RoutineDetailRouteProp>();
  const { routine, exercises } = route.params;
  const navigation = useNavigation<NavigationProp<WorkoutStackParamList>>();

  const [loading, setLoading] = useState(!!routine?.id);
  const [routineData, setRoutineData] = useState<any>(routine || null);
  const [routineTitle, setRoutineTitle] = useState(routine?.title || "");
  const [started, setStarted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [exercisesState, setExercises] = useState<ExerciseRequestDto[]>([]);
  const [sets, setSets] = useState<{ [exerciseId: string]: SetRequestDto[] }>(
    {}
  );

  useEffect(() => {
    if (route.params?.start) setStarted(true);
  }, [route.params?.start]);

  useEffect(() => {
    const fetchRoutine = async () => {
      if (routine?.id) {
        try {
          const data = await getRoutineById(routine.id);
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

    const initialSets: { [exerciseId: string]: SetRequestDto[] } = {};
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
      const resetSets: { [exerciseId: string]: SetRequestDto[] } = {};
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
        setRoutineTitle(newTitle);
      },
    });
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {!started && (
        <>
          <Text style={styles.title}>{routineTitle || "Nueva rutina"}</Text>
          {routineData?.id ? (
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.startButton}
                onPress={() => setStarted(true)}
              >
                <Text style={styles.startButtonText}>Iniciar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editButton}
                onPress={goToEditRoutine}
              >
                <Text style={styles.editButtonText}>Editar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.titleInput}
                placeholder="Nombre de la rutina"
                value={routineTitle}
                onChangeText={setRoutineTitle}
              />
            </View>
          )}
        </>
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

  return (
    <SafeAreaView style={styles.safeArea}>
      {started && (
        <View style={styles.fixedHeader}>
          <View style={styles.metricsRow}>
            <Text style={styles.metricItem}>⏱ {formatTime(duration)}</Text>
            <Text style={styles.metricItem}>🏋️ {volume} kg</Text>
            <Text style={styles.metricItem}>✅ {completedSets}</Text>
            <TouchableOpacity onPress={handleFinishRoutine}>
              <Text style={styles.finishButton}>Terminar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={exercisesState}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        renderItem={renderExerciseCard}
        contentContainerStyle={{ paddingTop: started ? 80 : 0, padding: 16 }}
      />

      {!routineData?.id && (
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveRoutine}>
          <Text style={styles.saveButtonText}>Guardar rutina</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },
  header: {
    marginBottom: 16,
    paddingHorizontal: 8,
    paddingTop: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 8,
  },
  startButton: {
    backgroundColor: "#6C3BAA",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    alignItems: "center",
    elevation: 2,
  },
  startButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  editButton: {
    backgroundColor: "#EDEAF6",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    alignItems: "center",
    elevation: 2,
  },
  editButtonText: {
    color: "#6C3BAA",
    fontWeight: "bold",
    fontSize: 15,
    letterSpacing: 0.5,
  },
  inputContainer: {
    marginTop: 12,
    alignItems: "center",
  },
  titleInput: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    elevation: 2,
    fontSize: 16,
    color: "#333",
    width: "95%",
    borderWidth: 1,
    borderColor: "#EDEAF6",
  },
  saveButton: {
    backgroundColor: "#6C3BAA",
    padding: 16,
    margin: 16,
    borderRadius: 20,
    alignItems: "center",
    elevation: 2,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  fixedHeader: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    elevation: 3,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EDEAF6",
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  metricItem: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#6C3BAA",
    backgroundColor: "#F4F4F8",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 70,
    textAlign: "center",
  },
  finishButton: {
    color: "#D32F2F",
    fontWeight: "bold",
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "#FDECEC",
    borderRadius: 12,
    elevation: 1,
  },
});
