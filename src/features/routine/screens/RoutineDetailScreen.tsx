import {
  ExerciseRequestDto,
  RoutineExerciseResponseDto,
  RoutineResponseDto,
  RoutineSessionEntity,
  SetRequestDto,
  SetResponseDto,
} from "@sergiomesasyelamos2000/shared";
import {
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useTheme } from "../../../contexts/ThemeContext";
import { notificationService } from "../../../services/notificationService";
import {
  saveRoutineOffline,
  saveSessionOffline,
  updateRoutineOffline,
} from "../../../services/offlineRoutineService";
import { useAuthStore } from "../../../store/useAuthStore";
import { useNotificationSettingsStore } from "../../../store/useNotificationSettingsStore";
import { useRecordsStore } from "../../../store/useRecordsStore";
import { useWorkoutInProgressStore } from "../../../store/useWorkoutInProgressStore";
import { CaughtError, getErrorMessage } from "../../../types";
import CustomToast from "../../../ui/CustomToast";
import ExerciseCard from "../components/ExerciseCard/ExerciseCard";
import UndoSnackbar from "../components/ExerciseCard/UndoSnackbar";
import { formatTime } from "../components/ExerciseCard/helpers";
import { RoutineHeader } from "../components/RoutineHeader";
import { RoutineMetrics } from "../components/RoutineMetrics";
import { ShortWorkoutConfirmModal } from "../components/ShortWorkoutConfirmModal";
import {
  findAllRoutineSessions,
  getRoutineById,
} from "../services/routineService";
import { calculateVolume, initializeSets } from "../utils/routineHelpers";
import {
  normalizeExerciseImage,
  normalizeExercisesImage,
} from "../utils/normalizeExerciseImage";
import { WorkoutStackParamList } from "./WorkoutStack";

type RoutineDetailRouteProp = RouteProp<WorkoutStackParamList, "RoutineDetail">;

const sortSetsByOrder = (sets: SetRequestDto[] = []): SetRequestDto[] =>
  [...sets]
    .map((set, index) => ({
      set,
      index,
      order:
        typeof set.order === "number" && Number.isFinite(set.order)
          ? set.order
          : Number.MAX_SAFE_INTEGER,
    }))
    .sort((a, b) => {
      if (a.order === b.order) return a.index - b.index;
      return a.order - b.order;
    })
    .map((entry) => entry.set);

const sortSetsMapByOrder = (setsMap: { [exerciseId: string]: SetRequestDto[] }) =>
  Object.fromEntries(
    Object.entries(setsMap).map(([exerciseId, setList]) => [
      exerciseId,
      sortSetsByOrder(setList || []),
    ])
  );

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

  const [loading, setLoading] = useState(Boolean(routineId && !routine));
  const [routineData, setRoutineData] = useState<RoutineResponseDto | null>(
    routine || null
  );
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
  const workoutStartTimeRef = useRef<number | null>(null);
  const durationRef = useRef(0);
  const slideAnim = useRef(new Animated.Value(100)).current;
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [previousSessions, setPreviousSessions] = useState<
    RoutineSessionEntity[]
  >([]);

  // Undo deletion state
  const [showUndoSnackbar, setShowUndoSnackbar] = useState(false);
  const [undoMessage, setUndoMessage] = useState("");
  const [onUndoCallback, setOnUndoCallback] = useState<(() => void) | null>(
    null
  );

  const handleShowUndoSnackbar = (message: string, onUndo: () => void) => {
    setUndoMessage(message);
    setOnUndoCallback(() => onUndo);
    setShowUndoSnackbar(true);
  };

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

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  const getWorkoutStartTime = useCallback(() => {
    if (workoutStartTimeRef.current) {
      return workoutStartTimeRef.current;
    }

    if (workoutInProgress?.startedAt) {
      workoutStartTimeRef.current = workoutInProgress.startedAt;
      return workoutInProgress.startedAt;
    }

    const inferredStartTime = Date.now() - durationRef.current * 1000;
    workoutStartTimeRef.current = inferredStartTime;
    return inferredStartTime;
  }, [workoutInProgress?.startedAt]);

  const syncDurationFromStartTime = useCallback(() => {
    const startTime = getWorkoutStartTime();
    const nextDuration = Math.max(
      0,
      Math.floor((Date.now() - startTime) / 1000)
    );
    setDuration(nextDuration);
  }, [getWorkoutStartTime]);

  // Calculate records achieved in this session
  const allRecords = useRecordsStore((state) => state.records);
  const sessionRecordsCount = useMemo(() => {
    if (!started) return 0;

    const startTime = new Date(getWorkoutStartTime());

    return allRecords.filter((r) => new Date(r.date) >= startTime).length;
  }, [allRecords, started, getWorkoutStartTime]);

  useEffect(() => {
    const hasInitialRoutine = Boolean(routine);
    const hasEmbeddedExercises = Array.isArray(
      (routine as RoutineResponseDto | undefined)?.routineExercises
    );

    if (routine) {
      setRoutineData(routine);
      setLoading(false);
    }

    if (!routineId) {
      setLoading(false);
      return;
    }

    // If routine comes from list as summary (without routineExercises), hydrate full detail by id.
    const shouldFetchById = !hasInitialRoutine || !hasEmbeddedExercises;
    if (!shouldFetchById) {
      return;
    }

    let isCancelled = false;
    if (!hasInitialRoutine) {
      setLoading(true);
    }

    const fetchRoutine = async () => {
      try {
        const data = await getRoutineById(routineId);
        if (!isCancelled) {
          setRoutineData(data);
        }
      } catch (err: CaughtError) {
        console.error("Error fetching routine by id", err);

        Alert.alert(
          "Error",
          getErrorMessage(err) ||
            "No se pudo cargar la rutina. Verifica tu conexión."
        );

        // Only go back if we do not have a local routine fallback.
        if (!isCancelled && !hasInitialRoutine) {
          navigation.goBack();
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchRoutine();
    return () => {
      isCancelled = true;
    };
  }, [routine, routineId, navigation]);

  useEffect(() => {
    if (!workoutInProgress || !route.params?.start || hasInitializedFromStore) {
      return;
    }

    setRoutineTitle(workoutInProgress.routineTitle);
    setExercises(workoutInProgress.exercises);
    setSets(sortSetsMapByOrder(workoutInProgress.sets));
    setDuration(workoutInProgress.duration);
    workoutStartTimeRef.current = workoutInProgress.startedAt;
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

    const normalizedInitialExercises = normalizeExercisesImage(initialExercises);
    setExercises(normalizedInitialExercises);

    const initialSets: { [exerciseId: string]: SetRequestDto[] } = {};
    normalizedInitialExercises.forEach((exercise) => {
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
      sets: ex?.sets?.map((set) => ({
        ...set,
        completed: false,
        previousWeight: set.weight,
        previousReps: set.reps || set.repsMin,
      })),
    }));

    setExercises(exercisesWithSets);

    const setsMap = exercisesWithSets.reduce(
      (acc, ex) => ({ ...acc, [ex.id]: ex.sets || [] }), // Agregar || []
      {} as { [exerciseId: string]: SetRequestDto[] }
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
    syncDurationFromStartTime();
    const interval = setInterval(syncDurationFromStartTime, 1000);
    return () => clearInterval(interval);
  }, [started, showShortWorkoutModal, syncDurationFromStartTime]);

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
        if (started) {
          syncDurationFromStartTime();
        }

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
  }, [navigation, theme, started, syncDurationFromStartTime]);

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

    const startedAt = Date.now();
    workoutStartTimeRef.current = startedAt;
    setDuration(0);

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
      startedAt,
    });

    setStarted(true);
  };

  const processFinishRoutine = async () => {
    try {
      // Debug: Check auth state before saving
      const currentUser = useAuthStore.getState().user;
      const isAuth = useAuthStore.getState().isAuthenticated;
      const token = useAuthStore.getState().accessToken;

      if (!currentUser?.id) {
        Alert.alert(
          "Error de Sesión",
          "No se encontró información del usuario. Por favor, cierra sesión y vuelve a iniciar sesión."
        );
        setStarted(true);
        return;
      }

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

      await notificationService.cancelAllRestTimers();

      const routineToSave = buildRoutinePayload();

      // Use offline-first service
      const updatedRoutine = routineData?.id
        ? await updateRoutineOffline(routineData.id, routineToSave)
        : await saveRoutineOffline(routineToSave);

      const sessionToSave = buildSessionPayload();
      await saveSessionOffline(updatedRoutine.id, sessionToSave);

      // Only clear workout after successful save
      clearWorkoutInProgress();
      workoutStartTimeRef.current = null;
      navigation.setParams({ start: undefined, routineId: undefined });

      resetSetsCompletionStatus();

      // Check if saved offline or online
      const isPending = (updatedRoutine as any)._isPending;
      const message = isPending
        ? "Rutina guardada localmente. Se sincronizará cuando haya conexión."
        : "Rutina y sesión guardadas exitosamente";

      Alert.alert("¡Éxito!", message);

      navigation.reset({
        index: 0,
        routes: [
          { name: "WorkoutList" },
          { name: "RoutineDetail", params: { routine: updatedRoutine } },
        ],
      });
    } catch (err: CaughtError) {
      console.error("Error saving routine:", err);

      const errorMessage = getErrorMessage(err);
      Alert.alert("Error", errorMessage);

      // Restore workout state if save failed
      setStarted(true);
      setHasInitializedFromStore(false);
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
    workoutStartTimeRef.current = null;
    setHasInitializedFromStore(false);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setShowRestToast(false);
    navigation.goBack();
  };

  const handleSaveRoutine = async () => {
    try {
      // Debug: Check auth state before saving
      const currentUser = useAuthStore.getState().user;
      const isAuth = useAuthStore.getState().isAuthenticated;
      const token = useAuthStore.getState().accessToken;

      if (!currentUser?.id) {
        Alert.alert(
          "Error de Sesión",
          "No se encontró información del usuario. Por favor, cierra sesión y vuelve a iniciar sesión."
        );
        return;
      }

      const routineToSave = buildRoutinePayload();
      const savedRoutine = await saveRoutineOffline(routineToSave);

      const isPending = (savedRoutine as any)._isPending;
      const message = isPending
        ? "Rutina guardada localmente. Se sincronizará cuando haya conexión."
        : "Rutina guardada exitosamente";

      Alert.alert("¡Éxito!", message);

      navigation.reset({
        index: 1,
        routes: [
          { name: "WorkoutList" },
          { name: "RoutineDetail", params: { routine: savedRoutine } },
        ],
      });
    } catch (err: CaughtError) {
      console.error("Error saving routine:", err);

      const errorMessage = getErrorMessage(err);
      Alert.alert("Error", errorMessage);
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
          clearInterval(countdownRef.current!);
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

  const mapRoutineExercises = (
    data: RoutineResponseDto
  ): ExerciseRequestDto[] => {
    const mapped = data.routineExercises?.map(
      (re: RoutineExerciseResponseDto) => {
        const exercise: ExerciseRequestDto = normalizeExerciseImage({
          ...re.exercise,
          sets: sortSetsByOrder(re.sets).map((set: SetResponseDto) => ({
            ...set,
            previousWeight: set.weight,
            previousReps: set.reps || set.repsMin,
          })),
          notes: re.notes,
          restSeconds: re.restSeconds,
          weightUnit: re.weightUnit || "kg",
          repsType: re.repsType || "reps",
          supersetWith: re.supersetWith || undefined,
        });

        return exercise;
      }
    );

    return mapped || [];
  };

  const buildRoutinePayload = () => {
    const payload = {
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
        supersetWith: exercise.supersetWith ?? undefined, // 🔥 Convertir null a undefined
      })),
    };

    return payload;
  };

  const buildSessionPayload = () => {
    const allRecords = useRecordsStore.getState().records;
    const startTime = new Date(getWorkoutStartTime());

    const sessionRecords = allRecords.filter(
      (r) => new Date(r.date) >= startTime
    );

    return {
      totalTime: duration,
      totalWeight: volume,
      completedSets,
      exercises: exercisesState.map((exercise) => ({
        exerciseId: exercise.id,
        name: exercise.name,
        exerciseName: exercise.name,
        imageUrl: exercise.imageUrl,
        giftUrl:
          (exercise as ExerciseRequestDto & { giftUrl?: string; gifUrl?: string })
            .giftUrl ||
          (exercise as ExerciseRequestDto & { giftUrl?: string; gifUrl?: string })
            .gifUrl,
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

  const renderExerciseCard = useCallback(
    ({ item }: { item: ExerciseRequestDto }) => {
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
        onCancelRestTimer={handleCancelRestTimer}
        onShowUndoSnackbar={handleShowUndoSnackbar}
        showOptions={false}
        supersetWith={item.supersetWith} // 🔥 PASAR PROP
        supersetExerciseName={supersetExercise?.name} // 🔥 PASAR PROP
        previousSessions={previousSessions} // For record detection
      />
    );
    },
    [
      exercisesState,
      previousSessions,
      readonly,
      started,
      sets,
      handleStartRestTimer,
      handleCancelRestTimer,
    ]
  );

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
        initialNumToRender={4}
        maxToRenderPerBatch={5}
        windowSize={7}
        removeClippedSubviews
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

      <UndoSnackbar
        visible={showUndoSnackbar}
        message={undoMessage}
        onUndo={() => {
          onUndoCallback?.();
          setShowUndoSnackbar(false);
        }}
        onDismiss={() => setShowUndoSnackbar(false)}
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
