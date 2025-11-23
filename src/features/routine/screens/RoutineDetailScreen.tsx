import {
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import uuid from "react-native-uuid";
import { ExerciseRequestDto, SetRequestDto } from "../../../models";
import { useWorkoutInProgressStore } from "../../../store/useWorkoutInProgressStore";
import CustomToast from "../../../ui/CustomToast";
import ExerciseCard from "../components/ExerciseCard/ExerciseCard";
import { formatTime } from "../components/ExerciseCard/helpers";
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
import { notificationService } from "../../../services/notificationService";
import { useTheme } from "../../../contexts/ThemeContext";

type RoutineDetailRouteProp = RouteProp<WorkoutStackParamList, "RoutineDetail">;

export default function RoutineDetailScreen() {
  const { theme } = useTheme();
  const route = useRoute<RoutineDetailRouteProp>();
  const navigation = useNavigation<NavigationProp<WorkoutStackParamList>>();
  const {
    routineId,
    routine,
    exercises: initialExercises,
    start,
  } = route.params;

  const [loading, setLoading] = useState(!!routine?.id);
  const [routineData, setRoutineData] = useState<any>(routine || null);
  const [routineTitle, setRoutineTitle] = useState(routine?.title || "");
  const [readonly, setReadonly] = useState(!!(routineId || routine?.id));
  const [started, setStarted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [exercisesState, setExercises] = useState<ExerciseRequestDto[]>([]);
  const [sets, setSets] = useState<{ [exerciseId: string]: SetRequestDto[] }>(
    {}
  );
  const [hasInitializedFromStore, setHasInitializedFromStore] = useState(false);

  const [showRestToast, setShowRestToast] = useState(false);
  const [restTimeRemaining, setRestTimeRemaining] = useState(0);
  const [totalRestTime, setTotalRestTime] = useState(0);
  const slideAnim = useRef(new Animated.Value(100)).current;
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const {
    workoutInProgress,
    setWorkoutInProgress,
    patchWorkoutInProgress,
    clearWorkoutInProgress,
    updateWorkoutProgress,
  } = useWorkoutInProgressStore();

  const allSets = useMemo(() => Object.values(sets).flat(), [sets]);
  const volume = useMemo(() => calculateVolume(allSets), [allSets]);
  const completedSets = useMemo(
    () => allSets.filter((s) => s.completed).length,
    [allSets]
  );

  useEffect(() => {
    if (routine) {
      setRoutineData(routine);
      setLoading(false);
      return;
    }

    if (!routineId) {
      setLoading(false);
      return;
    }

    const fetchRoutine = async () => {
      try {
        const data = await getRoutineById(routineId);
        setRoutineData(data);
      } catch (err) {
        console.error("Error fetching routine by id", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRoutine();
  }, [routine, routineId]);

  useEffect(() => {
    if (!workoutInProgress || !route.params?.start || hasInitializedFromStore) {
      return;
    }

    setRoutineTitle(workoutInProgress.routineTitle);
    setExercises(workoutInProgress.exercises);
    setSets(workoutInProgress.sets);
    setDuration(workoutInProgress.duration);
    setStarted(true);
    setHasInitializedFromStore(true);

    navigation.setParams({ start: undefined });
  }, [
    workoutInProgress,
    route.params?.start,
    hasInitializedFromStore,
    navigation,
  ]);

  useEffect(() => {
    if (hasInitializedFromStore || !initialExercises?.length) {
      return;
    }

    setExercises(initialExercises);

    const initialSets: { [exerciseId: string]: SetRequestDto[] } = {};
    initialExercises.forEach((exercise) => {
      initialSets[exercise.id] = initializeSets(exercise.sets).map((set) => ({
        ...set,
        completed: false,
      }));
    });
    setSets(initialSets);
    setRoutineTitle(routine?.title || "Nueva rutina");
  }, [initialExercises, hasInitializedFromStore, routine?.title]);

  useEffect(() => {
    if (hasInitializedFromStore || initialExercises?.length || !routineData) {
      return;
    }

    const mappedExercises: ExerciseRequestDto[] =
      mapRoutineExercises(routineData);
    setExercises(mappedExercises);
    setRoutineTitle(routineData.title || "");

    const initialSets: { [exerciseId: string]: SetRequestDto[] } = {};
    mappedExercises.forEach((exercise) => {
      initialSets[exercise.id] = initializeSets(exercise.sets);
    });
    setSets(initialSets);
  }, [routineData, initialExercises, hasInitializedFromStore]);

  useEffect(() => {
    if (
      !start ||
      !routineData ||
      workoutInProgress ||
      hasInitializedFromStore
    ) {
      return;
    }

    const exercisesWithSets = mapRoutineExercises(routineData).map((ex) => ({
      ...ex,
      sets: ex?.sets?.map((set: any) => ({
        ...set,
        completed: false,
        previousWeight: set.weight,
        previousReps: set.reps || set.repsMin,
      })),
    }));

    setExercises(exercisesWithSets);

    const setsMap = exercisesWithSets.reduce(
      (acc: any, ex: any) => ({ ...acc, [ex.id]: ex.sets }),
      {}
    );

    setWorkoutInProgress({
      routineId: routineData.id,
      routineTitle: routineData.title,
      duration: 0,
      volume: 0,
      completedSets: 0,
      exercises: exercisesWithSets,
      sets: setsMap,
      startedAt: Date.now(),
    });
  }, [
    start,
    routineData,
    workoutInProgress,
    hasInitializedFromStore,
    setWorkoutInProgress,
  ]);

  useEffect(() => {
    if (!started) return;
    const interval = setInterval(() => setDuration((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [started]);

  useEffect(() => {
    if (!started) return;

    const updatedSets = { ...sets };
    exercisesState.forEach((exercise) => {
      updatedSets[exercise.id] = updatedSets[exercise.id].map((set) => ({
        ...set,
        previousWeight: set.weight,
        previousReps: set.reps || set.repsMin,
      }));
    });
    setSets(updatedSets);
  }, [started]);

  useEffect(() => {
    if (route.params?.start) {
      setStarted(true);
    }
  }, [route.params?.start]);

  useEffect(() => {
    if (!started) return;

    patchWorkoutInProgress({
      duration,
      volume,
      completedSets,
      exercises: exercisesState.map((ex) => ({
        ...ex,
        sets: sets[ex.id] || [],
      })),
      sets,
    });
  }, [
    started,
    duration,
    volume,
    completedSets,
    sets,
    exercisesState,
    patchWorkoutInProgress,
  ]);

  useEffect(() => {
    if (!started) return;

    const interval = setInterval(() => {
      updateWorkoutProgress({ duration, volume, completedSets });
    }, 5000);

    return () => clearInterval(interval);
  }, [started, duration, volume, completedSets, updateWorkoutProgress]);

  useEffect(() => {
    const parent = (navigation as any).getParent?.();
    if (!parent?.setOptions) return;

    parent.setOptions({
      tabBarStyle: started ? { display: "none" } : undefined,
    });

    return () => {
      const p = (navigation as any).getParent?.();
      if (p?.setOptions) {
        p.setOptions({ tabBarStyle: undefined });
      }
    };
  }, [started, navigation]);

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
  }, [showRestToast, slideAnim]);

  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      const parent = (navigation as any).getParent?.();
      if (parent?.setOptions) {
        parent.setOptions({ tabBarStyle: undefined });
      }
    };
  }, [navigation]);

  const handleStartRoutine = () => {
    const initialSets: { [exerciseId: string]: SetRequestDto[] } = { ...sets };

    exercisesState.forEach((exercise) => {
      if (!initialSets[exercise.id] || initialSets[exercise.id].length === 0) {
        initialSets[exercise.id] = initializeSets(exercise.sets).map((s) => ({
          ...s,
          completed: false,
        }));
      }
    });

    setSets(initialSets);

    setWorkoutInProgress({
      routineId: routineData?.id || (routineId ?? (uuid.v4() as string)),
      routineTitle: routineTitle || routineData?.title || "Rutina",
      duration: 0,
      volume: 0,
      completedSets: 0,
      exercises: exercisesState.map((ex) => ({
        ...ex,
        sets: initialSets[ex.id] || [],
      })),
      sets: initialSets,
      startedAt: Date.now(),
    });

    setStarted(true);
  };

  const handleFinishAndSaveRoutine = async () => {
    try {
      setStarted(false);
      setHasInitializedFromStore(false);

      const parent = (navigation as any).getParent?.();
      if (parent?.setOptions) {
        parent.setOptions({ tabBarStyle: undefined });
      }

      clearWorkoutInProgress();
      navigation.setParams({ start: undefined, routineId: undefined });

      const routineToSave = buildRoutinePayload();
      const updatedRoutine = routineData?.id
        ? await updateRoutineById(routineData.id, routineToSave)
        : await saveRoutine(routineToSave);

      const sessionToSave = buildSessionPayload();
      await saveRoutineSession(updatedRoutine.id, sessionToSave);

      resetSetsCompletionStatus();

      Alert.alert("¡Éxito!", "Rutina y sesión guardadas exitosamente");

      navigation.reset({
        index: 0,
        routes: [
          { name: "WorkoutList" },
          { name: "RoutineDetail", params: { routine: updatedRoutine } },
        ],
      });
    } catch (err) {
      Alert.alert("Error", "Error al guardar la rutina");
    }
  };

  const handleSaveRoutine = async () => {
    try {
      const routineToSave = buildRoutinePayload();
      const savedRoutine = await saveRoutine(routineToSave);

      Alert.alert("¡Éxito!", "Rutina guardada exitosamente");

      navigation.reset({
        index: 1,
        routes: [
          { name: "WorkoutList" },
          { name: "RoutineDetail", params: { routine: savedRoutine } },
        ],
      });
    } catch {
      Alert.alert("Error", "Error al guardar la rutina");
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

  const handleStartRestTimer = async (restSeconds: number, exerciseName?: string) => {
    setTotalRestTime(restSeconds);
    setRestTimeRemaining(restSeconds);
    setShowRestToast(true);

    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }

    // Start push notification timer
    await notificationService.startRestTimer(restSeconds, exerciseName);

    // Keep the visual toast timer
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

  const mapRoutineExercises = (data: any): ExerciseRequestDto[] => {
    return (
      data.routineExercises?.map((re: any) => ({
        ...re.exercise,
        sets: re.sets.map((set: any) => ({
          ...set,
          previousWeight: set.weight,
          previousReps: set.reps || set.repsMin,
        })),
        notes: re.notes,
        restSeconds: re.restSeconds,
        weightUnit: re.weightUnit || "kg",
        repsType: re.repsType || "reps",
        supersetWith: re.supersetWith || null, // 🔥 MAPEAR SUPERSERIES
      })) ||
      data.exercises?.map((ex: any) => ({
        ...ex,
        weightUnit: ex.weightUnit || "kg",
        repsType: ex.repsType || "reps",
        supersetWith: ex.supersetWith || null, // 🔥 MAPEAR SUPERSERIES
      })) ||
      []
    );
  };

  const buildRoutinePayload = () => ({
    ...routineData,
    id: routineData?.id || (uuid.v4() as string),
    title: routineTitle,
    createdAt: routineData?.createdAt
      ? new Date(routineData.createdAt)
      : new Date(),
    exercises: exercisesState.map((exercise) => ({
      ...exercise,
      imageUrl: exercise.imageUrl,
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
      supersetWith: exercise.supersetWith || null, // 🔥 INCLUIR SUPERSERIES
    })),
  });

  const buildSessionPayload = () => ({
    totalTime: duration,
    totalWeight: volume,
    completedSets,
    exercises: exercisesState.map((exercise) => ({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      imageUrl: exercise.imageUrl,
      totalWeight: (sets[exercise.id] || []).reduce(
        (acc, s) => acc + (s.weight || 0) * (s.reps || 0),
        0
      ),
      totalReps: (sets[exercise.id] || []).reduce(
        (acc, s) => acc + (s.reps || 0),
        0
      ),
      sets: (sets[exercise.id] || []).map((s) => ({
        weight: s.weight || 0,
        reps: s.reps || 0,
        completed: s.completed ?? false,
      })),
    })),
  });

  const resetSetsCompletionStatus = () => {
    const resetSets: { [exerciseId: string]: SetRequestDto[] } = {};
    Object.keys(sets).forEach((exerciseId) => {
      resetSets[exerciseId] = sets[exerciseId].map((set) => ({
        ...set,
        completed: false,
      }));
    });
    setSets(resetSets);
  };

  const renderExerciseCard = ({ item }: { item: ExerciseRequestDto }) => {
    // 🔥 Buscar el nombre del ejercicio con el que hace superserie
    const supersetExercise = item.supersetWith
      ? exercisesState.find((ex) => ex.id === item.supersetWith)
      : null;

    return (
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
        showOptions={false}
        supersetWith={item.supersetWith} // 🔥 PASAR PROP
        supersetExerciseName={supersetExercise?.name} // 🔥 PASAR PROP
      />
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.loadingText}>Cargando rutina...</Text>
      </SafeAreaView>
    );
  }

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
            onStart={handleStartRoutine}
            onEdit={goToEditRoutine}
            onChangeTitle={setRoutineTitle}
            readonly={readonly}
          />
        }
        renderItem={renderExerciseCard}
        contentContainerStyle={{ paddingTop: started ? 80 : 0, padding: 16 }}
      />

      {!routineData?.id && !started && (
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveRoutine}>
          <Text style={styles.saveButtonText}>Guardar rutina</Text>
        </TouchableOpacity>
      )}

      {showRestToast && (
        <Animated.View
          style={[
            styles.toastContainer,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <CustomToast
            text1={formatTime({
              minutes: Math.floor(restTimeRemaining / 60),
              seconds: restTimeRemaining % 60,
            })}
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
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },
  loadingText: {
    textAlign: "center",
    marginTop: 40,
    fontSize: RFValue(16),
    color: "#6B7280",
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
    fontSize: RFValue(16),
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
