import {
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import uuid from "react-native-uuid";
import { ExerciseRequestDto, SetRequestDto } from "../../../models";
import ExerciseCard from "../components/ExerciseCard/ExerciseCard";
import { RoutineHeader } from "../components/RoutineHeader";
import { RoutineMetrics } from "../components/RoutineMetrics";
import {
  getRoutineById,
  saveRoutine,
  saveRoutineSession,
  updateRoutineById,
} from "../services/routineService";
import { calculateVolume, initializeSets } from "../utils/routineHelpers";
import { WorkoutStackParamList } from "./WorkoutStack";
import CustomToast from "../../../ui/CustomToast";
import { formatTime } from "../components/ExerciseCard/helpers";

type RoutineDetailRouteProp = RouteProp<WorkoutStackParamList, "RoutineDetail">;

export default function RoutineDetailScreen() {
  const route = useRoute<RoutineDetailRouteProp>();
  const navigation = useNavigation<NavigationProp<WorkoutStackParamList>>();
  const { routine, exercises } = route.params;
  const [readonly, setReadonly] = useState(!!routine?.id);

  const [loading, setLoading] = useState(!!routine?.id);
  const [routineData, setRoutineData] = useState<any>(routine || null);
  const [routineTitle, setRoutineTitle] = useState(routine?.title || "");
  const [started, setStarted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [exercisesState, setExercises] = useState<ExerciseRequestDto[]>([]);
  const [sets, setSets] = useState<{ [exerciseId: string]: SetRequestDto[] }>(
    {}
  );

  // Estados para el temporizador global
  const [showRestToast, setShowRestToast] = useState(false);
  const [restTimeRemaining, setRestTimeRemaining] = useState(0);
  const [totalRestTime, setTotalRestTime] = useState(0);
  const slideAnim = useRef(new Animated.Value(100)).current;
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (started) {
      const updatedSets = { ...sets };
      exercisesState.forEach((exercise) => {
        updatedSets[exercise.id] = updatedSets[exercise.id].map((set) => ({
          ...set,
          previousWeight: set.weight, // Marca anterior: peso
          previousReps: set.reps || set.repsMin, // Marca anterior: repeticiones
        }));
      });
      setSets(updatedSets);
    }
  }, [started]);
  useEffect(() => {
    if (route.params?.start) setStarted(true);
  }, [route.params?.start]);

  useEffect(() => {
    if (!routine?.id) return;
    const fetchRoutine = async () => {
      try {
        const data = await getRoutineById(routine.id);
        console.log("Fetched routine data:", data);

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
      setExercises(exercises);

      const initialSets: { [exerciseId: string]: SetRequestDto[] } = {};
      exercises.forEach((exercise) => {
        initialSets[exercise.id] = initializeSets(exercise.sets).map((set) => ({
          ...set,
          completed: false, // 🔄 Asegurar que nuevas series no estén completadas
        }));
      });
      setSets(initialSets);

      setRoutineTitle(routine?.title || "Nueva rutina");
    }
  }, [exercises]);

  // 🔹 Si NO hay ejercicios seleccionados y sí hay routineData → cargar desde la rutina guardada
  useEffect(() => {
    if (exercises && exercises.length > 0) return; // 🚫 no pisar lo anterior
    if (!routineData) return;

    const mappedExercises: ExerciseRequestDto[] =
      routineData.routineExercises?.map((re: any) => ({
        ...re.exercise,
        sets: re.sets.map((set: any) => ({
          ...set,
          previousWeight: set.weight, // Cargar el peso guardado como marca anterior
          previousReps: set.reps || set.repsMin, // Cargar las repeticiones guardadas como marca anterior
        })),
        notes: re.notes,
        restSeconds: re.restSeconds,
        weightUnit: re.weightUnit || "kg",
        repsType: re.repsType || "reps",
      })) ||
      routineData.exercises?.map((ex: any) => ({
        ...ex,
        weightUnit: ex.weightUnit || "kg",
        repsType: ex.repsType || "reps",
      })) ||
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

  const handleFinishAndSaveRoutine = async () => {
    try {
      setStarted(false);

      const routineToSave = {
        ...routineData,
        id: routineData?.id || (uuid.v4() as string),
        title: routineTitle,
        createdAt: routineData?.createdAt
          ? new Date(routineData.createdAt)
          : new Date(),
        exercises: exercisesState.map((exercise) => ({
          ...exercise,
          sets:
            sets[exercise.id]?.map((set) => ({
              ...set,
              weight: set.weight || 0,
              reps: set.reps || 0,
              repsMin: set.repsMin || 0,
              repsMax: set.repsMax || 0,
            })) || [],
          weightUnit: exercise.weightUnit || "kg",
          repsType: exercise.repsType || "reps",
        })),
      };

      let updatedRoutine;

      if (routineData?.id) {
        updatedRoutine = await updateRoutineById(routineData.id, routineToSave);
      } else {
        updatedRoutine = await saveRoutine(routineToSave);
      }

      await saveRoutineSession(updatedRoutine.id, {
        totalTime: duration,
        totalWeight: volume,
        completedSets,
      });

      // 🔄 Restablecer todas las series a no completadas
      const resetSets: { [exerciseId: string]: SetRequestDto[] } = {};
      Object.keys(sets).forEach((exerciseId) => {
        resetSets[exerciseId] = sets[exerciseId].map((set) => ({
          ...set,
          completed: false,
        }));
      });
      setSets(resetSets);

      alert("Rutina y sesión guardadas exitosamente");

      navigation.reset({
        index: 1,
        routes: [
          { name: "WorkoutList" },
          { name: "RoutineDetail", params: { routine: updatedRoutine } },
        ],
      });
    } catch {
      alert("Error al guardar la rutina");
    }
  };

  const handleSaveRoutine = async () => {
    try {
      const routineToSave = {
        id: routineData?.id || (uuid.v4() as string),
        title: routineTitle,
        createdAt: routineData?.createdAt
          ? new Date(routineData.createdAt)
          : new Date(),
        exercises: exercisesState.map((exercise) => ({
          ...exercise,
          sets: sets[exercise.id] || [],
          weightUnit: exercise.weightUnit || "kg",
          repsType: exercise.repsType || "reps",
        })),
      };
      const savedRoutine = await saveRoutine(routineToSave);

      alert("Rutina guardada exitosamente");

      navigation.reset({
        index: 1,
        routes: [
          { name: "WorkoutList" },
          { name: "RoutineDetail", params: { routine: savedRoutine } },
        ],
      });
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
      readonly={readonly && !started}
      started={started}
      onStartRestTimer={handleStartRestTimer}
    />
  );

  const handleStartRestTimer = (restSeconds: number) => {
    setTotalRestTime(restSeconds);
    setRestTimeRemaining(restSeconds);
    setShowRestToast(true);

    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }

    countdownRef.current = setInterval(() => {
      setRestTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current as NodeJS.Timeout);
          setShowRestToast(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleAddRestTime = () => {
    setRestTimeRemaining((prev) => {
      const newTime = prev + 15;
      setTotalRestTime(newTime);
      return newTime;
    });
  };

  const handleSubtractRestTime = () => {
    setRestTimeRemaining((prev) => {
      const newTime = Math.max(0, prev - 15);
      setTotalRestTime(newTime);
      return newTime;
    });
  };

  const handleCancelRestTimer = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
    setShowRestToast(false);
  };

  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  // Animación para el toast
  useEffect(() => {
    if (showRestToast) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [showRestToast]);

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
          onFinish={handleFinishAndSaveRoutine}
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
            readonly={readonly}
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

      {/* Toast de descanso global */}
      {showRestToast && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <CustomToast
            text1={`${formatTime({
              minutes: Math.floor(restTimeRemaining / 60),
              seconds: restTimeRemaining % 60,
            })}`}
            progress={restTimeRemaining / totalRestTime}
            onCancel={handleCancelRestTimer}
            onAddTime={handleAddRestTime}
            onSubtractTime={handleSubtractRestTime}
          />
        </Animated.View>
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
  toastContainer: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 1000,
  },
});
