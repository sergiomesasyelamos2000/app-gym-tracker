import React, { useState, useEffect, useMemo } from "react";
import {
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  Text,
  StyleSheet,
} from "react-native";
import uuid from "react-native-uuid";
import {
  NavigationProp,
  useNavigation,
  RouteProp,
  useRoute,
} from "@react-navigation/native";
import { ExerciseRequestDto, SetRequestDto } from "../../../models";
import { getRoutineById, saveRoutine } from "../services/routineService";
import { calculateVolume, initializeSets } from "../utils/routineHelpers";
import ExerciseCard from "../components/ExerciseCard/ExerciseCard";
import { RoutineMetrics } from "../components/RoutineMetrics";
import { RoutineHeader } from "../components/RoutineHeader";
import { WorkoutStackParamList } from "./WorkoutStack";

type RoutineDetailRouteProp = RouteProp<WorkoutStackParamList, "RoutineDetail">;

export default function RoutineDetailScreen() {
  const route = useRoute<RoutineDetailRouteProp>();
  const navigation = useNavigation<NavigationProp<WorkoutStackParamList>>();
  const { routine, exercises } = route.params;

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
    if (!routine?.id) return;
    const fetchRoutine = async () => {
      try {
        const data = await getRoutineById(routine.id);
        setRoutineData(data);
      } catch (err) {
        console.error("Error fetching routine by id", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRoutine();
  }, [routine?.id]);

  // 🔹 Si vienen ejercicios por params → prioridad absoluta
  useEffect(() => {
    if (exercises && exercises.length > 0) {
      console.log("Ejercicios desde ExerciseList:", exercises);
      setExercises(exercises);

      const initialSets: { [exerciseId: string]: SetRequestDto[] } = {};
      exercises.forEach((exercise) => {
        initialSets[exercise.id] = initializeSets(exercise.sets);
      });
      setSets(initialSets);

      // Si es nueva rutina (sin title), ponemos uno por defecto
      setRoutineTitle(routine?.title || "Nueva rutina");
    }
  }, [exercises]);

  // 🔹 Si NO hay ejercicios seleccionados y sí hay routineData → cargar desde la rutina guardada
  useEffect(() => {
    if (exercises && exercises.length > 0) return; // 🚫 no pisar lo anterior
    if (!routineData) return;

    console.log("Routine data loaded:", routineData);

    const mappedExercises: ExerciseRequestDto[] =
      routineData.routineExercises?.map((re: any) => ({
        ...re.exercise,
        sets: re.sets || [],
        notes: re.notes,
        restSeconds: re.restSeconds,
      })) ||
      routineData.exercises ||
      [];

    setExercises(mappedExercises);
    setRoutineTitle(routineData.title || "");

    const initialSets: { [exerciseId: string]: SetRequestDto[] } = {};
    mappedExercises.forEach((exercise) => {
      initialSets[exercise.id] = initializeSets(exercise.sets);
    });
    setSets(initialSets);
  }, [routineData, exercises]);

  useEffect(() => {
    if (!started) return;
    const interval = setInterval(() => setDuration((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [started]);

  const allSets = useMemo(() => Object.values(sets).flat(), [sets]);
  const volume = useMemo(() => calculateVolume(allSets), [allSets]);
  const completedSets = useMemo(
    () => allSets.filter((s) => s.completed).length,
    [allSets]
  );

  const handleFinishRoutine = () => {
    setStarted(false);
    setDuration(0);
    setSets((prev) => {
      const reset: { [id: string]: SetRequestDto[] } = {};
      Object.keys(prev).forEach((id) => {
        reset[id] = prev[id]?.map((s) => ({ ...s, completed: false })) || [];
      });
      return reset;
    });
  };

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
    } catch {
      alert("Error al guardar la rutina");
    }
  };

  const goToEditRoutine = () => {
    const exercisesForEdit = exercisesState.map((ex) => ({
      ...ex,
      sets: sets[ex.id] || [],
    }));
    navigation.navigate("RoutineEdit", {
      id: routineData?.id ?? "",
      title: routineData?.title || "",
      exercises: exercisesForEdit,
      onUpdate: (newTitle: string) => setRoutineTitle(newTitle),
    });
  };

  const renderExerciseCard = ({ item }: { item: ExerciseRequestDto }) => (
    <ExerciseCard
      exercise={item}
      initialSets={sets[item.id] || []}
      onChangeSets={(updatedSets) =>
        setSets((prev) => ({ ...prev, [item.id]: updatedSets }))
      }
      onChangeExercise={(updatedExercise) =>
        setExercises((prev) =>
          prev.map((ex) =>
            ex.id === updatedExercise.id ? updatedExercise : ex
          )
        )
      }
    />
  );

  if (loading)
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={{ textAlign: "center", marginTop: 40 }}>
          Cargando rutina...
        </Text>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={styles.safeArea}>
      {started && (
        <RoutineMetrics
          duration={duration}
          volume={volume}
          completedSets={completedSets}
          onFinish={handleFinishRoutine}
        />
      )}
      <FlatList
        data={exercisesState}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <RoutineHeader
            routineTitle={routineTitle}
            started={started}
            routineId={routineData?.id}
            onStart={() => setStarted(true)}
            onEdit={goToEditRoutine}
            onChangeTitle={setRoutineTitle}
          />
        }
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
  safeArea: { flex: 1, backgroundColor: "#F7F8FA" },
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
});
