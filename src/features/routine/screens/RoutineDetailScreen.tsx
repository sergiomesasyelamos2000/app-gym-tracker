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
  AppState,
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
import { useNotificationSettingsStore } from "../../../store/useNotificationSettingsStore";
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
  findAllRoutineSessions,
} from "../services/routineService";
import { calculateVolume, initializeSets } from "../utils/routineHelpers";
import { WorkoutStackParamList } from "./WorkoutStack";
import { notificationService } from "../../../services/notificationService";
import { useTheme } from "../../../contexts/ThemeContext";
import { useRecordsStore } from "../../../store/useRecordsStore";
import { ShortWorkoutConfirmModal } from "../components/ShortWorkoutConfirmModal";

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

  // Notification settings
  const restTimerNotificationsEnabled = useNotificationSettingsStore(
    (state) => state.restTimerNotificationsEnabled
  );

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
  const [currentExerciseName, setCurrentExerciseName] = useState<
    string | undefined
  >();
  const [activeNotificationId, setActiveNotificationId] = useState<
    string | null
  >(null);
  const [restTimerEndTime, setRestTimerEndTime] = useState<number | null>(null);
  const restTimerEndTimeRef = useRef<number | null>(null);
  const slideAnim = useRef(new Animated.Value(100)).current;
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const [previousSessions, setPreviousSessions] = useState<any[]>([]);
  const [showShortWorkoutModal, setShowShortWorkoutModal] = useState(false);
  const [frozenDuration, setFrozenDuration] = useState(0);
  const MIN_WORKOUT_DURATION = 300; // 5 minutos

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

  // Calculate records achieved in this session
  const allRecords = useRecordsStore((state) => state.records);
  const sessionRecordsCount = useMemo(() => {
    if (!started) return 0;

    // If we have a workout in progress, use its start time, otherwise use current time minus duration
    const startTime = workoutInProgress?.startedAt
      ? new Date(workoutInProgress.startedAt)
      : new Date(Date.now() - duration * 1000);

    return allRecords.filter((r) => new Date(r.date) >= startTime).length;
  }, [allRecords, started, workoutInProgress?.startedAt, duration]);

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
    if (!started || showShortWorkoutModal) return;
    const interval = setInterval(() => setDuration((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [started, showShortWorkoutModal]);

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

  // Load previous sessions for record detection
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const sessions = await findAllRoutineSessions();
        setPreviousSessions(sessions);
      } catch (error) {
        console.error("Error loading sessions:", error);
      }
    };
    loadSessions();
  }, []);

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
      tabBarStyle: started
        ? { display: "none" }
        : {
            backgroundColor: theme.tabBarBackground,
            borderTopColor: theme.tabBarBorder,
            borderTopWidth: 1,
          },
    });

    return () => {
      const p = (navigation as any).getParent?.();
      if (p?.setOptions) {
        p.setOptions({
          tabBarStyle: {
            backgroundColor: theme.tabBarBackground,
            borderTopColor: theme.tabBarBorder,
            borderTopWidth: 1,
          },
        });
      }
    };
  }, [started, navigation, theme]);

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
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        const endTime = restTimerEndTimeRef.current;
        if (endTime) {
          const now = Date.now();
          const remaining = Math.ceil((endTime - now) / 1000);

          if (remaining <= 0) {
            // Time has passed
            setShowRestToast(false);
            setActiveNotificationId(null);
            setRestTimerEndTime(null);
            restTimerEndTimeRef.current = null;
            setRestTimeRemaining(0);
            if (countdownRef.current) clearInterval(countdownRef.current);
          } else {
            // Update remaining time
            setRestTimeRemaining(remaining);
          }
        }
      }
    });

    return () => {
      subscription.remove();
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      const parent = (navigation as any).getParent?.();
      if (parent?.setOptions) {
        parent.setOptions({
          tabBarStyle: {
            backgroundColor: theme.tabBarBackground,
            borderTopColor: theme.tabBarBorder,
            borderTopWidth: 1,
          },
        });
      }
    };
  }, [navigation, theme]);

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

  const processFinishRoutine = async () => {
    try {
      setStarted(false);
      setHasInitializedFromStore(false);

      const parent = (navigation as any).getParent?.();
      if (parent?.setOptions) {
        parent.setOptions({
          tabBarStyle: {
            backgroundColor: theme.tabBarBackground,
            borderTopColor: theme.tabBarBorder,
            borderTopWidth: 1,
          },
        });
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

  const handleFinishAndSaveRoutine = async () => {
    // Freeze the current duration before showing modal
    setFrozenDuration(duration);

    if (duration < MIN_WORKOUT_DURATION) {
      setShowShortWorkoutModal(true);
      return;
    }
    await processFinishRoutine();
  };

  const handleDiscardWorkout = () => {
    setShowShortWorkoutModal(false);
    setStarted(false);
    clearWorkoutInProgress();
    setHasInitializedFromStore(false);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setShowRestToast(false);
    navigation.goBack();
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

  const handleStartRestTimer = async (
    restSeconds: number,
    exerciseName?: string
  ) => {
    setTotalRestTime(restSeconds);
    setRestTimeRemaining(restSeconds);
    const endTime = Date.now() + restSeconds * 1000;
    setRestTimerEndTime(endTime);
    restTimerEndTimeRef.current = endTime;
    setCurrentExerciseName(exerciseName);
    setShowRestToast(true);

    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }

    // Start push notification timer only if enabled in settings
    if (restTimerNotificationsEnabled) {
      // startRestTimer now handles cancellation of previous timers internally
      const notificationId = await notificationService.startRestTimer(
        restSeconds,
        exerciseName
      );
      setActiveNotificationId(notificationId);
    }

    // Keep the visual toast timer
    countdownRef.current = setInterval(() => {
      setRestTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current as NodeJS.Timeout);
          setShowRestToast(false);
          setActiveNotificationId(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleAddRestTime = async () => {
    const newTime = restTimeRemaining + 15;
    setRestTimeRemaining(newTime);
    setTotalRestTime((prev) => prev + 15);
    const endTime = Date.now() + newTime * 1000;
    setRestTimerEndTime(endTime);
    restTimerEndTimeRef.current = endTime;

    // Reschedule notification with new time
    if (restTimerNotificationsEnabled) {
      // startRestTimer now handles cancellation of previous timers internally
      const notificationId = await notificationService.startRestTimer(
        newTime,
        currentExerciseName
      );
      setActiveNotificationId(notificationId);
    }
  };

  const handleSubtractRestTime = async () => {
    const newTime = Math.max(0, restTimeRemaining - 15);
    setRestTimeRemaining(newTime);
    setTotalRestTime((prev) => Math.max(0, prev - 15));
    const endTime = Date.now() + newTime * 1000;
    setRestTimerEndTime(endTime);
    restTimerEndTimeRef.current = endTime;

    // Reschedule notification with new time
    if (restTimerNotificationsEnabled) {
      // startRestTimer now handles cancellation of previous timers internally
      const notificationId = await notificationService.startRestTimer(
        newTime,
        currentExerciseName
      );
      setActiveNotificationId(notificationId);
    }
  };

  const handleCancelRestTimer = async () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }

    // Cancel the scheduled notification
    if (activeNotificationId) {
      await notificationService.cancelRestTimer(activeNotificationId);
      setActiveNotificationId(null);
    }

    setRestTimerEndTime(null);
    restTimerEndTimeRef.current = null;
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

  const buildSessionPayload = () => {
    const allRecords = useRecordsStore.getState().records;
    const startTime = workoutInProgress?.startedAt
      ? new Date(workoutInProgress.startedAt)
      : new Date(Date.now() - duration * 1000);

    const sessionRecords = allRecords.filter(
      (r) => new Date(r.date) >= startTime
    );

    return {
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
        sets: (sets[exercise.id] || []).map((s) => {
          const isRecord = sessionRecords.some(
            (r) =>
              r.exerciseId === exercise.id &&
              r.setData.weight === (s.weight || 0) &&
              r.setData.reps === (s.reps || 0)
          );

          return {
            weight: s.weight || 0,
            reps: s.reps || 0,
            completed: s.completed ?? false,
            isRecord,
          };
        }),
      })),
    };
  };

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
        previousSessions={previousSessions} // For record detection
      />
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[
          styles.safeArea,
          { backgroundColor: theme.backgroundSecondary },
        ]}
      >
        <Text style={[styles.loadingText, { color: theme.text }]}>
          Cargando rutina...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.backgroundSecondary }]}
    >
      {started && (
        <RoutineMetrics
          duration={duration}
          volume={volume}
          completedSets={completedSets}
          records={sessionRecordsCount}
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
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.primary }]}
          onPress={handleSaveRoutine}
        >
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

      <ShortWorkoutConfirmModal
        visible={showShortWorkoutModal}
        duration={frozenDuration}
        onContinue={() => setShowShortWorkoutModal(false)}
        onDiscard={handleDiscardWorkout}
        onSave={() => {
          setShowShortWorkoutModal(false);
          processFinishRoutine();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingText: {
    textAlign: "center",
    marginTop: 40,
    fontSize: RFValue(16),
  },
  saveButton: {
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
