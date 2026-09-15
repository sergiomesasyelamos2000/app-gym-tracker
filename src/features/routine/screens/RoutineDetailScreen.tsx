import {
  ExerciseRequestDto,
  RoutineExerciseResponseDto,
  RoutineResponseDto,
  RoutineSessionEntity,
  SetRequestDto,
  SetResponseDto,
} from "@sergiomesasyelamos2000/shared";
import {
  CommonActions,
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { HeaderBackButton } from "@react-navigation/elements";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  DeviceEventEmitter,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { RFValue } from "react-native-responsive-fontsize";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import uuid from "react-native-uuid";
import Icon from "react-native-vector-icons/MaterialIcons";
import CachedExerciseImage from "../../../components/CachedExerciseImage";
import { useTheme } from "../../../contexts/ThemeContext";
import { notificationService } from "../../../services/notificationService";
import { playRestCompleteFeedback } from "../../../services/restTimerFeedback";
import {
  consumeAppTerminatedAt,
  consumePendingCompleteSet,
  endWorkoutLive,
  getCurrentRestTimerLiveState,
  pollNativeIntent,
  startWorkoutLive,
  subscribeToWorkoutLiveIntents,
  updateWorkoutLive,
  type WorkoutLiveSnapshot,
} from "../../../services/workoutLiveService";
import {
  saveRoutineOffline,
  saveSessionOffline,
  updateRoutineOffline,
} from "../../../services/offlineRoutineService";
import { useAuthStore } from "../../../store/useAuthStore";
import { useNotificationSettingsStore } from "../../../store/useNotificationSettingsStore";
import { useRecordsStore } from "../../../store/useRecordsStore";
import {
  flushWorkoutInProgressPersist,
  useWorkoutInProgressStore,
  type WorkoutInProgress,
} from "../../../store/useWorkoutInProgressStore";
import { CaughtError, getErrorMessage } from "../../../types";
import CustomToast from "../../../ui/CustomToast";
import {
  setRestToastKeyboardActive,
  useKeyboardHeight,
} from "../../../hooks/useKeyboardHeight";
import ExerciseCard from "../components/ExerciseCard/ExerciseCard";
import UndoSnackbar from "../components/ExerciseCard/UndoSnackbar";
import { formatTime } from "../components/ExerciseCard/helpers";
import { RoutineHeader } from "../components/RoutineHeader";
import { LiveRoutineMetrics } from "../components/RoutineMetrics";
import { ShortWorkoutConfirmModal } from "../components/ShortWorkoutConfirmModal";
import {
  LiveWorkoutHealthPanel,
  getHealthClient,
  invalidateSessionBurnCache,
  useHealthConnectionStore,
  type WorkoutHealthSnapshot,
} from "../../health";
import {
  findAllRoutineSessions,
  getRoutineById,
} from "../services/routineService";
import { calculateVolume, initializeSets } from "../utils/routineHelpers";
import {
  buildNextSetSummary,
  buildLiveCompletionFingerprint,
  findNextIncompleteSet,
} from "../utils/workoutLiveHelpers";
import {
  normalizeExerciseImage,
  normalizeExercisesImage,
  getStaticExerciseImageUrl,
} from "../utils/normalizeExerciseImage";
import { WorkoutStackParamList } from "./WorkoutStack";
import { useShallow } from "zustand/react/shallow";

type RoutineDetailRouteProp = RouteProp<WorkoutStackParamList, "RoutineDetail">;
type SetWithPreviousAssisted = SetRequestDto & {
  previousWeight?: number;
  previousReps?: number;
  previousAssistedReps?: number;
};

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

const sortSetsMapByOrder = (setsMap: {
  [exerciseId: string]: SetRequestDto[];
}) =>
  Object.fromEntries(
    Object.entries(setsMap).map(([exerciseId, setList]) => [
      exerciseId,
      sortSetsByOrder(setList || []),
    ])
  );

export default function RoutineDetailScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const keyboardHeight = useKeyboardHeight();
  const route = useRoute<RoutineDetailRouteProp>();
  const navigation = useNavigation<NavigationProp<WorkoutStackParamList>>();
  const {
    routineId,
    routine,
    exercises: initialExercises,
    start,
    sessionView,
    sessionTitle,
    sessionDateLabel,
    replaceExerciseId,
    replacementExercise,
  } = route.params;

  // Notification settings
  const restTimerNotificationsEnabled = useNotificationSettingsStore(
    (state) => state.restTimerNotificationsEnabled
  );

  const [loading, setLoading] = useState(Boolean(routineId && !routine));
  const [isExercisesLoading, setIsExercisesLoading] = useState(
    !(initialExercises && initialExercises.length > 0)
  );
  const [routineData, setRoutineData] = useState<RoutineResponseDto | null>(
    routine || null
  );
  const [routineTitle, setRoutineTitle] = useState(
    sessionTitle || routine?.title || ""
  );
  const [readonly, setReadonly] = useState(
    Boolean(sessionView || routineId || routine?.id)
  );
  const [started, setStarted] = useState(false);
  const [exercisesState, setExercises] = useState<ExerciseRequestDto[]>([]);
  const [sets, setSets] = useState<{ [exerciseId: string]: SetRequestDto[] }>(
    {}
  );
  const [hasInitializedFromStore, setHasInitializedFromStore] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const [reorderFromButton, setReorderFromButton] = useState(false);
  const [tempExercisesOrder, setTempExercisesOrder] = useState<
    ExerciseRequestDto[]
  >([]);

  const [showRestToast, setShowRestToast] = useState(false);
  const [restTimeRemaining, setRestTimeRemaining] = useState(0);
  const [totalRestTime, setTotalRestTime] = useState(0);
  const [currentExerciseName, setCurrentExerciseName] = useState<
    string | undefined
  >();
  const currentExerciseNameRef = useRef<string | undefined>(undefined);
  const [currentExerciseImageUrl, setCurrentExerciseImageUrl] = useState<
    string | null | undefined
  >();
  const [currentNextSetSummary, setCurrentNextSetSummary] = useState<
    string | null | undefined
  >();
  const [activeNotificationId, setActiveNotificationId] = useState<
    string | null
  >(null);
  const [restTimerEndTime, setRestTimerEndTime] = useState<number | null>(null);
  const restTimerEndTimeRef = useRef<number | null>(null);
  const restTimeRemainingRef = useRef(0);
  const workoutStartTimeRef = useRef<number | null>(null);
  const liveExerciseIdRef = useRef<string | null>(null);
  const liveSnapshotRef = useRef<WorkoutLiveSnapshot | null>(null);
  const liveFingerprintRef = useRef<string>("");
  const livePushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savePauseStartedAtRef = useRef<number | null>(null);
  const durationRef = useRef(0);
  const healthSnapshotRef = useRef<WorkoutHealthSnapshot | null>(null);
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

  const handleShowUndoSnackbar = useCallback(
    (message: string, onUndo: () => void) => {
      setUndoMessage(message);
      setOnUndoCallback(() => onUndo);
      setShowUndoSnackbar(true);
    },
    []
  );

  const handleChangeSetsForExercise = useCallback(
    (exerciseId: string, updatedSets: SetRequestDto[]) => {
      setSets((prev) => ({ ...prev, [exerciseId]: updatedSets }));
    },
    []
  );

  const handleChangeExercise = useCallback(
    (updatedExercise: ExerciseRequestDto) => {
      setExercises((prev) =>
        prev.map((ex) =>
          ex.id === updatedExercise.id ? updatedExercise : ex
        )
      );
    },
    []
  );

  // Creation (!readonly) and active workout (started) both allow reorder;
  // viewing an existing routine (readonly && !started) does not.
  const canReorderExercises = !sessionView && (!readonly || started);

  const handleReorderFromHeader = useCallback(() => {
    setReorderMode(true);
    setReorderFromButton(true);
    setTempExercisesOrder(exercisesState);
  }, [exercisesState]);

  const handleExerciseLongPress = useCallback((drag: () => void) => {
    setReorderMode(true);
    setReorderFromButton(false);
    setTimeout(() => {
      drag();
    }, 100);
  }, []);

  const handleConfirmReorder = useCallback(() => {
    setExercises(tempExercisesOrder);
    setReorderMode(false);
    setReorderFromButton(false);
    setTempExercisesOrder([]);
  }, [tempExercisesOrder]);

  const handleReorderComplete = useCallback(
    (data: ExerciseRequestDto[]) => {
      if (reorderFromButton) {
        setTempExercisesOrder(data);
      } else {
        setExercises(data);
        setReorderMode(false);
      }
    },
    [reorderFromButton]
  );

  const handleDeleteExercise = useCallback((exerciseId: string) => {
    const exerciseName =
      exercisesState.find((ex) => ex.id === exerciseId)?.name ||
      "este ejercicio";

    Alert.alert(
      "Eliminar ejercicio",
      `¿Estás seguro de que deseas eliminar "${exerciseName}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            setExercises((prev) => {
              const removed = prev.find((ex) => ex.id === exerciseId);
              const partnerId = removed?.supersetWith;
              return prev
                .filter((ex) => ex.id !== exerciseId)
                .map((ex) =>
                  partnerId && ex.id === partnerId
                    ? { ...ex, supersetWith: undefined }
                    : ex
                );
            });
            setSets((prev) => {
              const next = { ...prev };
              delete next[exerciseId];
              return next;
            });
          },
        },
      ]
    );
  }, [exercisesState]);

  const handleAddSuperset = useCallback(
    (exerciseId: string, targetExerciseId: string) => {
      setExercises((prev) =>
        prev.map((ex) => {
          if (ex.id === exerciseId) {
            return { ...ex, supersetWith: targetExerciseId };
          }
          if (ex.id === targetExerciseId) {
            return { ...ex, supersetWith: exerciseId };
          }
          return ex;
        })
      );
      Alert.alert(
        "Superserie creada",
        "Los ejercicios se han vinculado correctamente"
      );
    },
    []
  );

  const handleRemoveSuperset = useCallback((exerciseId: string) => {
    setExercises((prev) => {
      const partnerId = prev.find((ex) => ex.id === exerciseId)?.supersetWith;
      return prev.map((ex) => {
        if (ex.id === exerciseId || (partnerId && ex.id === partnerId)) {
          return { ...ex, supersetWith: undefined };
        }
        return ex;
      });
    });
  }, []);

  const handleReplaceExercise = useCallback(
    (exerciseId: string) => {
      const draftExercises = exercisesState.map((exercise) => ({
        ...exercise,
        sets: sortSetsByOrder(sets[exercise.id] || []),
      }));

      navigation.navigate("ExerciseList", {
        // Omit fake ids during creation so merge does not treat this as an existing routine.
        ...(routineData?.id || routineId
          ? { routineId: routineData?.id ?? routineId }
          : {}),
        singleSelection: true,
        mode: "replaceExercise",
        replaceExerciseId: exerciseId,
        draftTitle: routineTitle,
        draftExercises,
        returnTo: "RoutineDetail",
      });
    },
    [exercisesState, sets, navigation, routineData?.id, routineId, routineTitle]
  );

  // Apply exercise replacement returning from ExerciseList (active workout or creation)
  useEffect(() => {
    if (!replaceExerciseId || !replacementExercise) return;
    // View-only mode should never mutate exercises via replace params.
    if (!started && readonly) return;

    const normalizedReplacement = normalizeExerciseImage(replacementExercise);
    const oldId = replaceExerciseId;

    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id === oldId) {
          return {
            ...normalizedReplacement,
            restSeconds: ex.restSeconds,
            weightUnit: ex.weightUnit,
            repsType: ex.repsType,
            notes: ex.notes,
            order: ex.order,
            supersetWith: ex.supersetWith,
          };
        }
        if (ex.supersetWith === oldId) {
          return { ...ex, supersetWith: normalizedReplacement.id };
        }
        return ex;
      })
    );

    setSets((prev) => {
      const next = { ...prev };
      next[normalizedReplacement.id] = prev[oldId] || [];
      delete next[oldId];
      return next;
    });

    navigation.setParams({
      replaceExerciseId: undefined,
      replacementExercise: undefined,
    });
  }, [replaceExerciseId, replacementExercise, started, readonly, navigation]);

  const [showShortWorkoutModal, setShowShortWorkoutModal] = useState(false);
  const [frozenDuration, setFrozenDuration] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingTerminationAt, setPendingTerminationAt] = useState<
    number | null
  >(null);
  const hasConsumedTerminationMarkerRef = useRef(false);
  const MIN_WORKOUT_DURATION = 300; // 5 minutos
  const targetRoutineId = routineData?.id ?? routineId;

  const {
    workoutInProgress,
    setWorkoutInProgress,
    patchWorkoutInProgress,
    clearWorkoutInProgress,
  } = useWorkoutInProgressStore(
    useShallow((state) => ({
      workoutInProgress: state.workoutInProgress,
      setWorkoutInProgress: state.setWorkoutInProgress,
      patchWorkoutInProgress: state.patchWorkoutInProgress,
      clearWorkoutInProgress: state.clearWorkoutInProgress,
    }))
  );
  const hasMatchingWorkoutInProgress =
    !!workoutInProgress &&
    !!targetRoutineId &&
    workoutInProgress.routineId === targetRoutineId;

  const allSets = useMemo(() => Object.values(sets).flat(), [sets]);
  const volume = useMemo(() => calculateVolume(allSets), [allSets]);
  const completedSets = useMemo(
    () => allSets.filter((s) => s.completed).length,
    [allSets]
  );

  useEffect(() => {
    if (hasConsumedTerminationMarkerRef.current) return;
    hasConsumedTerminationMarkerRef.current = true;

    consumeAppTerminatedAt().then((terminatedAt) => {
      if (!terminatedAt) return;
      setPendingTerminationAt(terminatedAt);
    });
  }, []);

  useEffect(() => {
    if (!pendingTerminationAt || !workoutInProgress || workoutInProgress.pausedAt) {
      return;
    }

    const durationAtTermination = Math.max(
      workoutInProgress.duration,
      Math.floor((pendingTerminationAt - workoutInProgress.startedAt) / 1000)
    );

    patchWorkoutInProgress({
      duration: durationAtTermination,
      pausedAt: pendingTerminationAt,
    });
    void notificationService.cancelAllRestTimers();
    void endWorkoutLive();
    if (countdownRef.current) clearInterval(countdownRef.current);
    setRestTimerEndTime(null);
    restTimerEndTimeRef.current = null;
    setShowRestToast(false);
    setRestTimeRemaining(0);
    setActiveNotificationId(null);
    setPendingTerminationAt(null);
  }, [
    pendingTerminationAt,
    workoutInProgress,
    patchWorkoutInProgress,
  ]);

  const handleExitSessionView = useCallback(() => {
    if (!sessionView) return;

    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "WorkoutList" }],
      })
    );

    const parent = navigation.getParent() as
      | (NavigationProp<Record<string, object | undefined>> & {
          addListener: (
            eventName: string,
            callback: (event: { target?: string }) => void
          ) => () => void;
          getState: () => {
            index: number;
            routes: Array<{ key: string }>;
          };
        })
      | undefined;
    parent?.navigate("Inicio" as never);
  }, [navigation, sessionView]);

  useLayoutEffect(() => {
    if (!sessionView) {
      navigation.setOptions({
        headerLeft: undefined,
        title: "Detalle",
      });
      return;
    }

    navigation.setOptions({
      title: sessionTitle || "Detalle de sesión",
      headerLeft: () => (
        <HeaderBackButton
          tintColor={theme.text}
          onPress={handleExitSessionView}
        />
      ),
    });
  }, [
    handleExitSessionView,
    navigation,
    sessionTitle,
    sessionView,
    theme.primary,
  ]);

  useEffect(() => {
    if (!sessionView) {
      return;
    }

    const parent = navigation.getParent() as
      | (NavigationProp<Record<string, object | undefined>> & {
          addListener: (
            eventName: string,
            callback: (event: { target?: string }) => void
          ) => () => void;
          getState: () => {
            index: number;
            routes: Array<{ key: string }>;
          };
        })
      | undefined;
    if (!parent) {
      return;
    }

    const unsubscribe = parent.addListener("tabPress", (event: any) => {
      const parentState = parent.getState();
      const currentTabKey = parentState.routes[parentState.index]?.key;

      if (!event?.target || event.target === currentTabKey) {
        return;
      }

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "WorkoutList" }],
        })
      );
    });

    return unsubscribe;
  }, [navigation, sessionView]);

  useEffect(() => {
    restTimeRemainingRef.current = restTimeRemaining;
  }, [restTimeRemaining]);

  useEffect(() => {
    currentExerciseNameRef.current = currentExerciseName;
  }, [currentExerciseName]);

  const clearRestCountdownInterval = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  /** Tick from absolute end time so UI stays in sync with the notification. */
  const startRestCountdownInterval = useCallback(() => {
    clearRestCountdownInterval();
    countdownRef.current = setInterval(() => {
      const endTime = restTimerEndTimeRef.current;
      if (!endTime) {
        clearRestCountdownInterval();
        return;
      }

      // floor matches Android Chronometer MM:SS better than ceil
      const remaining = Math.max(
        0,
        Math.floor((endTime - Date.now()) / 1000)
      );
      setRestTimeRemaining(remaining);

      if (remaining <= 0) {
        clearRestCountdownInterval();
        setShowRestToast(false);
        setActiveNotificationId(null);
        setRestTimerEndTime(null);
        restTimerEndTimeRef.current = null;
        // Keep workout Live Activity; only leave rest mode.
        const startedAt =
          workoutStartTimeRef.current ??
          Date.now() - durationRef.current * 1000;
        void updateWorkoutLive({
          workoutStartedAtMs: startedAt,
          exerciseName: currentExerciseNameRef.current ?? "Entrenamiento",
          imageUrl: undefined,
          nextSetSummary: undefined,
          isResting: false,
          restEndAtMs: null,
        });
        void playRestCompleteFeedback();
      }
    }, 250);
  }, [clearRestCountdownInterval]);

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

  const pushWorkoutLive = useCallback(
    (partial?: Partial<WorkoutLiveSnapshot>) => {
      if (sessionView || !started) return;
      const startedAt = getWorkoutStartTime();
      const exerciseId = liveExerciseIdRef.current || exercisesState[0]?.id;
      const exercise =
        exercisesState.find((e) => e.id === exerciseId) || exercisesState[0];
      const setList = exercise ? sets[exercise.id] || [] : [];
      const nextSummary =
        partial?.nextSetSummary !== undefined
          ? partial.nextSetSummary
          : buildNextSetSummary(setList);
      const restDefaultRaw = exercise?.restSeconds;
      const restSecondsDefault =
        typeof restDefaultRaw === "number"
          ? restDefaultRaw
          : parseInt(String(restDefaultRaw || "90"), 10) || 90;

      const snapshot: WorkoutLiveSnapshot = {
        workoutStartedAtMs: startedAt,
        exerciseName:
          partial?.exerciseName ??
          currentExerciseNameRef.current ??
          exercise?.name ??
          "Entrenamiento",
        imageUrl:
          partial?.imageUrl !== undefined
            ? partial.imageUrl
            : currentExerciseImageUrl ??
              (exercise ? getStaticExerciseImageUrl(exercise) : null),
        nextSetSummary: nextSummary,
        isResting:
          partial?.isResting ?? Boolean(restTimerEndTimeRef.current),
        restEndAtMs:
          partial?.restEndAtMs !== undefined
            ? partial.restEndAtMs
            : restTimerEndTimeRef.current,
        restSecondsDefault,
      };
      liveSnapshotRef.current = snapshot;
      void updateWorkoutLive(snapshot);
      return snapshot;
    },
    [
      currentExerciseImageUrl,
      exercisesState,
      getWorkoutStartTime,
      sessionView,
      sets,
      started,
    ]
  );

  const startWorkoutLiveSession = useCallback(() => {
    if (sessionView) return;
    const startedAt = getWorkoutStartTime();
    const exercise = exercisesState[0];
    if (exercise) {
      liveExerciseIdRef.current = exercise.id;
      setCurrentExerciseName(exercise.name);
      currentExerciseNameRef.current = exercise.name;
      setCurrentExerciseImageUrl(getStaticExerciseImageUrl(exercise));
      setCurrentNextSetSummary(buildNextSetSummary(sets[exercise.id] || []));
    }
    const snapshot: WorkoutLiveSnapshot = {
      workoutStartedAtMs: startedAt,
      exerciseName: exercise?.name || routineTitle || "Entrenamiento",
      imageUrl: exercise ? getStaticExerciseImageUrl(exercise) : null,
      nextSetSummary: exercise
        ? buildNextSetSummary(sets[exercise.id] || [])
        : null,
      isResting: false,
      restEndAtMs: null,
      restSecondsDefault: exercise?.restSeconds
        ? parseInt(String(exercise.restSeconds), 10) || 90
        : 90,
    };
    liveSnapshotRef.current = snapshot;
    void startWorkoutLive(snapshot);
  }, [
    exercisesState,
    getWorkoutStartTime,
    routineTitle,
    sessionView,
    sets,
  ]);

  const getDurationSeconds = useCallback(() => durationRef.current, []);

  const handleHealthSnapshotChange = useCallback(
    (snapshot: WorkoutHealthSnapshot) => {
      healthSnapshotRef.current = snapshot;
    },
    []
  );

  const handleDurationSample = useCallback((seconds: number) => {
    durationRef.current = seconds;
  }, []);

  const persistWorkoutSnapshot = useCallback(
    async (options?: { flush?: boolean; includeDuration?: boolean }) => {
      if (!started) return;

      const partial: Partial<WorkoutInProgress> = {
        volume,
        completedSets,
        exercises: exercisesState.map((ex) => ({
          ...ex,
          sets: sets[ex.id] || [],
        })),
        sets,
      };

      if (options?.includeDuration !== false) {
        partial.duration = durationRef.current;
      }

      patchWorkoutInProgress(partial);

      if (options?.flush) {
        await flushWorkoutInProgressPersist();
      }
    },
    [
      started,
      volume,
      completedSets,
      exercisesState,
      sets,
      patchWorkoutInProgress,
    ]
  );

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
    if (
      sessionView ||
      !workoutInProgress ||
      !route.params?.start ||
      hasInitializedFromStore
    ) {
      return;
    }

    // Only hydrate from persisted workout if it belongs to the routine being opened.
    if (targetRoutineId && workoutInProgress.routineId !== targetRoutineId) {
      return;
    }

    setRoutineTitle(workoutInProgress.routineTitle);
    setExercises(normalizeExercisesImage(workoutInProgress.exercises));
    setSets(sortSetsMapByOrder(workoutInProgress.sets));
    const isPaused = typeof workoutInProgress.pausedAt === "number";
    const restoredDuration = Math.max(0, workoutInProgress.duration);
    const restoredStartedAt = isPaused
      ? Date.now() - restoredDuration * 1000
      : workoutInProgress.startedAt;

    durationRef.current = restoredDuration;
    workoutStartTimeRef.current = restoredStartedAt;
    if (isPaused) {
      patchWorkoutInProgress({
        startedAt: restoredStartedAt,
        pausedAt: undefined,
      });
    }
    setStarted(true);
    setHasInitializedFromStore(true);
    setIsExercisesLoading(false);

    navigation.setParams({ start: undefined });
  }, [
    sessionView,
    workoutInProgress,
    route.params?.start,
    hasInitializedFromStore,
    targetRoutineId,
    navigation,
    patchWorkoutInProgress,
  ]);

  useEffect(() => {
    if (hasInitializedFromStore || !initialExercises?.length) {
      return;
    }

    const normalizedInitialExercises = sessionView
      ? initialExercises
      : normalizeExercisesImage(initialExercises);
    setExercises(normalizedInitialExercises);

    const initialSets: { [exerciseId: string]: SetRequestDto[] } = {};
    normalizedInitialExercises.forEach((exercise) => {
      initialSets[exercise.id] = sessionView
        ? sortSetsByOrder(exercise.sets || []).map((set, index) => ({
            ...set,
            id:
              typeof set.id === "string" && set.id.trim().length > 0
                ? set.id
                : `${exercise.id}_session_set_${index + 1}`,
          }))
        : initializeSets(exercise.sets).map((set) => ({
            ...set,
            completed: false,
          }));
    });
    setSets(initialSets);
    setRoutineTitle(sessionTitle || routine?.title || "Nueva rutina");
    setIsExercisesLoading(false);
  }, [
    initialExercises,
    hasInitializedFromStore,
    routine?.title,
    sessionTitle,
    sessionView,
  ]);

  useEffect(() => {
    if (hasInitializedFromStore || initialExercises?.length || !routineData) {
      return;
    }

    const mappedExercises: ExerciseRequestDto[] =
      mapRoutineExercises(routineData);

    setExercises(mappedExercises);
    setRoutineTitle(sessionTitle || routineData.title || "");

    const initialSets: { [exerciseId: string]: SetRequestDto[] } = {};
    mappedExercises.forEach((exercise) => {
      initialSets[exercise.id] = initializeSets(exercise.sets);
    });
    setSets(initialSets);
    setIsExercisesLoading(false);
  }, [routineData, initialExercises, hasInitializedFromStore, sessionTitle]);

  useEffect(() => {
    if (routineId || routine || initialExercises?.length) {
      return;
    }
    setIsExercisesLoading(false);
  }, [routineId, routine, initialExercises?.length]);

  useEffect(() => {
    if (
      sessionView ||
      !start ||
      !routineData ||
      hasMatchingWorkoutInProgress ||
      hasInitializedFromStore
    ) {
      return;
    }

    const exercisesWithSets = mapRoutineExercises(routineData).map((ex) => ({
      ...ex,
      sets: ex?.sets?.map((set) => ({
        ...set,
        weight: 0,
        reps: 0,
        assistedReps: 0,
        completed: false,
        previousWeight: set.weight,
        previousReps: set.reps || set.repsMin,
        previousAssistedReps: set.assistedReps,
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
    void flushWorkoutInProgressPersist();
  }, [
    sessionView,
    start,
    routineData,
    hasInitializedFromStore,
    hasMatchingWorkoutInProgress,
    setWorkoutInProgress,
  ]);

  useEffect(() => {
    if (!started) {
      savePauseStartedAtRef.current = null;
      return;
    }

    if (isSaving) {
      if (!savePauseStartedAtRef.current) {
        savePauseStartedAtRef.current = Date.now();
      }
      return;
    }

    if (!savePauseStartedAtRef.current) return;

    const pausedMs = Date.now() - savePauseStartedAtRef.current;
    savePauseStartedAtRef.current = null;

    if (workoutStartTimeRef.current) {
      workoutStartTimeRef.current += pausedMs;
      patchWorkoutInProgress({ startedAt: workoutStartTimeRef.current });
    }
  }, [started, isSaving, patchWorkoutInProgress]);

  useEffect(() => {
    if (!started) return;

    const updatedSets = { ...sets };
    exercisesState.forEach((exercise) => {
      updatedSets[exercise.id] = updatedSets[exercise.id].map((rawSet) => {
        const set = rawSet as SetWithPreviousAssisted;

        return {
          ...set,
          previousWeight:
            typeof set.previousWeight === "number"
              ? set.previousWeight
              : set.weight,
          previousReps:
            typeof set.previousReps === "number"
              ? set.previousReps
              : set.reps || set.repsMin,
          previousAssistedReps:
            typeof set.previousAssistedReps === "number"
              ? set.previousAssistedReps
              : set.assistedReps,
        };
      });
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

  // Persist sets/exercises when they change — not on every duration tick.
  useEffect(() => {
    if (!started) return;
    void persistWorkoutSnapshot({ includeDuration: false });
  }, [
    started,
    volume,
    completedSets,
    sets,
    exercisesState,
    persistWorkoutSnapshot,
  ]);

  // Flush duration + snapshot when app goes to background.
  useEffect(() => {
    if (!started) return;

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "background" || nextAppState === "inactive") {
        void persistWorkoutSnapshot({ flush: true, includeDuration: true });
      }
    });

    return () => subscription.remove();
  }, [started, persistWorkoutSnapshot]);

  useEffect(() => {
    const parent = (navigation as any).getParent?.();
    if (!parent?.setOptions) return;

    parent.setOptions({
      tabBarStyle:
        started || isSaving
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
  }, [started, isSaving, navigation, theme]);

  useEffect(() => {
    if (!isSaving) return;

    const unsubscribe = navigation.addListener("beforeRemove", (event: any) => {
      if (event?.data?.action?.type === "RESET") return;
      event.preventDefault();
    });

    return unsubscribe;
  }, [navigation, isSaving]);

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

  const syncRestTimerFromNativeState = useCallback(async () => {
    if (Platform.OS !== "ios") return false;

    const liveState = await getCurrentRestTimerLiveState();
    // Module missing or no state — never clear the in-app toast from this path.
    if (!liveState) return false;

    const endTimestampMs = liveState.endTimestampMs;
    // Live Activity inactive/expired must not hide the JS banner. The in-app
    // countdown + scheduled notification own the timer when Live Activity fails
    // or is not present in the binary.
    if (
      !liveState.isActive ||
      !endTimestampMs ||
      endTimestampMs <= Date.now()
    ) {
      return false;
    }

    const newTime = Math.max(
      0,
      Math.floor((endTimestampMs - Date.now()) / 1000)
    );

    setShowRestToast(true);
    setRestTimeRemaining(newTime);
    setTotalRestTime((prev) => Math.max(newTime, prev || newTime));
    setRestTimerEndTime(endTimestampMs);
    restTimerEndTimeRef.current = endTimestampMs;
    startRestCountdownInterval();

    if (liveState.exerciseName) {
      setCurrentExerciseName(liveState.exerciseName);
    }

    if (liveState.nextSetSummary) {
      setCurrentNextSetSummary(liveState.nextSetSummary);
    }

    if (restTimerNotificationsEnabled) {
      const notificationId = await notificationService.startRestTimer(
        newTime,
        liveState.exerciseName || currentExerciseName,
        endTimestampMs
      );
      setActiveNotificationId(notificationId);
    }

    return true;
  }, [
    currentExerciseName,
    restTimerNotificationsEnabled,
    startRestCountdownInterval,
  ]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        void (async () => {
          const syncedFromNative = await syncRestTimerFromNativeState();

          if (started && !isSaving) {
            // LiveRoutineMetrics resamples on AppState active; keep durationRef warm.
            const startTime = getWorkoutStartTime();
            durationRef.current = Math.max(
              0,
              Math.floor((Date.now() - startTime) / 1000)
            );

            const pendingComplete = await consumePendingCompleteSet();
            if (pendingComplete) {
              DeviceEventEmitter.emit("onWorkoutLiveIntent", {
                action: "completeSet",
                delta: 0,
              });
            }
          }

          const endTime = restTimerEndTimeRef.current;
          if (endTime) {
            const now = Date.now();
            const remaining = Math.floor((endTime - now) / 1000);

            if (remaining <= 0) {
              // Time has passed
              setShowRestToast(false);
              setActiveNotificationId(null);
              setRestTimerEndTime(null);
              restTimerEndTimeRef.current = null;
              setRestTimeRemaining(0);
              const startedAt =
                workoutStartTimeRef.current ??
                Date.now() - durationRef.current * 1000;
              void updateWorkoutLive({
                workoutStartedAtMs: startedAt,
                exerciseName: currentExerciseNameRef.current ?? "Entrenamiento",
                isResting: false,
                restEndAtMs: null,
              });
              if (countdownRef.current) clearInterval(countdownRef.current);
              void playRestCompleteFeedback();
            } else if (!syncedFromNative) {
              // Update remaining time from the shared absolute end timestamp.
              setRestTimeRemaining(Math.max(0, remaining));
              void updateWorkoutLive({
                workoutStartedAtMs:
                  workoutStartTimeRef.current ??
                  Date.now() - durationRef.current * 1000,
                exerciseName: currentExerciseNameRef.current ?? "Entrenamiento",
                isResting: true,
                restEndAtMs: endTime,
              });
            }
          }
        })();
      }
    });

    // Do NOT clear the rest countdown here. This effect re-runs when workout
    // metadata changes (e.g. currentExerciseName on timer start), and clearing
    // the interval freezes the toast while the Android notification keeps ticking.
    return () => {
      subscription.remove();
    };
  }, [
    started,
    isSaving,
    getWorkoutStartTime,
    syncRestTimerFromNativeState,
  ]);

  useEffect(() => {
    void syncRestTimerFromNativeState();
  }, [syncRestTimerFromNativeState]);

  const handleStartRoutine = () => {
    if (isSaving) return;
    const initialSets: { [exerciseId: string]: SetRequestDto[] } = {};

    exercisesState.forEach((exercise) => {
      const existingSets =
        sets[exercise.id]?.length > 0
          ? sets[exercise.id]
          : initializeSets(exercise.sets);

      initialSets[exercise.id] = existingSets.map((rawSet) => {
        const set = rawSet as SetWithPreviousAssisted;

        return {
          ...set,
          weight: 0,
          reps: 0,
          assistedReps: 0,
          completed: false,
          previousWeight:
            typeof set.previousWeight === "number"
              ? set.previousWeight
              : set.weight,
          previousReps:
            typeof set.previousReps === "number"
              ? set.previousReps
              : set.reps || set.repsMin,
          previousAssistedReps:
            typeof set.previousAssistedReps === "number"
              ? set.previousAssistedReps
              : set.assistedReps,
        };
      });
    });

    setSets(initialSets);

    const startedAt = Date.now();
    workoutStartTimeRef.current = startedAt;
    durationRef.current = 0;

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
    void flushWorkoutInProgressPersist();

    setStarted(true);
  };

  // Start Hevy-style Live Activity for the whole workout.
  useEffect(() => {
    if (!started || sessionView || isSaving) return;
    startWorkoutLiveSession();
  }, [started]); // eslint-disable-line react-hooks/exhaustive-deps

  const wasStartedRef = useRef(false);
  useEffect(() => {
    if (wasStartedRef.current && !started) {
      void endWorkoutLive();
    }
    wasStartedRef.current = started;
  }, [started]);

  // Keep Live Activity in sync, but:
  // - skip when the completion/next-set fingerprint is unchanged (typing on other sets)
  // - debounce 400ms so rapid weight/reps edits coalesce into one native update
  useEffect(() => {
    if (!started || sessionView) return;
    if (restTimerEndTimeRef.current) return;

    const fingerprint = buildLiveCompletionFingerprint(
      sets,
      liveExerciseIdRef.current
    );
    if (fingerprint === liveFingerprintRef.current) return;
    liveFingerprintRef.current = fingerprint;

    if (livePushTimerRef.current) clearTimeout(livePushTimerRef.current);
    livePushTimerRef.current = setTimeout(() => {
      pushWorkoutLive({ isResting: false });
    }, 400);

    return () => {
      if (livePushTimerRef.current) {
        clearTimeout(livePushTimerRef.current);
        livePushTimerRef.current = null;
      }
    };
  }, [sets, exercisesState, started, sessionView, pushWorkoutLive]);

  // Poll Live Activity intents only while resting (not the whole workout).
  useEffect(() => {
    if (!showRestToast || Platform.OS !== "ios") return;

    const pollInterval = setInterval(() => {
      pollNativeIntent();
    }, 1500);

    return () => clearInterval(pollInterval);
  }, [showRestToast]);

  const processFinishRoutine = async () => {
    if (isSaving) return;
    setIsSaving(true);

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
      void endWorkoutLive();

      const routineToSave = buildRoutinePayload();

      // Use offline-first service
      const updatedRoutine = routineData?.id
        ? await updateRoutineOffline(routineData.id, routineToSave)
        : await saveRoutineOffline(routineToSave);

      const sessionToSave = buildSessionPayload();
      await saveSessionOffline(updatedRoutine.id, sessionToSave);
      invalidateSessionBurnCache();

      // Fire-and-forget: mirror workout into Apple Salud / Health Connect.
      try {
        const { writeWorkoutsToHub, status } =
          useHealthConnectionStore.getState();
        if (
          writeWorkoutsToHub &&
          (status === "granted" || status === "undetermined")
        ) {
          const startMs = getWorkoutStartTime();
          const endMs = Date.now();
          void getHealthClient().writeWorkout({
            startMs,
            endMs,
            title: routineTitle || "Entrenamiento EvoFit",
            caloriesBurned: sessionToSave.caloriesBurned,
          });
        }
      } catch {
        // Never fail session save because of hub write.
      }

      // Only clear workout after successful save
      clearWorkoutInProgress();
      workoutStartTimeRef.current = null;
      navigation.setParams({ start: undefined, routineId: undefined });

      setStarted(false);
      setHasInitializedFromStore(false);
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
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinishAndSaveRoutine = async () => {
    if (isSaving) return;
    // Freeze the current duration before showing modal
    const currentDuration = durationRef.current;
    setFrozenDuration(currentDuration);

    if (currentDuration < MIN_WORKOUT_DURATION) {
      setShowShortWorkoutModal(true);
      return;
    }
    await processFinishRoutine();
  };

  const handleDiscardWorkout = () => {
    if (isSaving) return;
    setShowShortWorkoutModal(false);
    setStarted(false);
    void endWorkoutLive();
    clearWorkoutInProgress();
    workoutStartTimeRef.current = null;
    setHasInitializedFromStore(false);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setShowRestToast(false);
    navigation.goBack();
  };

  const handleSaveRoutine = async () => {
    if (isSaving) return;
    setIsSaving(true);

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
    } finally {
      setIsSaving(false);
    }
  };

  const goToEditRoutine = () => {
    if (isSaving) return;
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
    exerciseId: string,
    exerciseName?: string,
    imageUrl?: string | null,
    nextSetSummary?: string | null
  ) => {
    const resolvedUpcomingSummary = (() => {
      if (nextSetSummary?.trim()) {
        return nextSetSummary.trim();
      }

      const currentExerciseIndex = exercisesState.findIndex(
        (exercise) => exercise.id === exerciseId
      );

      if (currentExerciseIndex >= 0) {
        const nextExercise = exercisesState[currentExerciseIndex + 1];
        if (nextExercise?.name?.trim()) {
          return `Próximo ejercicio: ${nextExercise.name.trim()}`;
        }
      }

      return null;
    })();

    console.log(
      "[RestTimerLive] start",
      restSeconds,
      exerciseName ?? "no-exercise"
    );
    setTotalRestTime(restSeconds);
    setRestTimeRemaining(restSeconds);
    const endTime = Date.now() + restSeconds * 1000;
    setRestTimerEndTime(endTime);
    restTimerEndTimeRef.current = endTime;
    setCurrentExerciseName(exerciseName);
    currentExerciseNameRef.current = exerciseName;
    setCurrentExerciseImageUrl(imageUrl);
    setCurrentNextSetSummary(resolvedUpcomingSummary);
    setShowRestToast(true);
    if (exerciseId) {
      liveExerciseIdRef.current = exerciseId;
    }

    void updateWorkoutLive({
      workoutStartedAtMs: getWorkoutStartTime(),
      exerciseName: exerciseName ?? "Descanso",
      imageUrl,
      nextSetSummary: resolvedUpcomingSummary,
      isResting: true,
      restEndAtMs: endTime,
    });
    startRestCountdownInterval();

    if (restTimerNotificationsEnabled) {
      const notificationId = await notificationService.startRestTimer(
        restSeconds,
        exerciseName,
        endTime
      );
      setActiveNotificationId(notificationId);
    }
  };

  const applyRestTimerDelta = useCallback(
    async (deltaSeconds: number, syncNativeLiveActivity = true) => {
      const currentRemaining = restTimerEndTimeRef.current
        ? Math.max(
            0,
            Math.floor((restTimerEndTimeRef.current - Date.now()) / 1000)
          )
        : restTimeRemainingRef.current;
      const newTime = Math.max(0, currentRemaining + deltaSeconds);

      setRestTimeRemaining(newTime);
      if (deltaSeconds > 0) {
        setTotalRestTime((prev) => prev + deltaSeconds);
      } else {
        setTotalRestTime((prev) => Math.max(0, prev + deltaSeconds));
      }

      const endTime = Date.now() + newTime * 1000;
      setRestTimerEndTime(endTime);
      restTimerEndTimeRef.current = endTime;
      startRestCountdownInterval();

      if (syncNativeLiveActivity) {
        await updateWorkoutLive({
          workoutStartedAtMs: getWorkoutStartTime(),
          exerciseName: currentExerciseName ?? "Descanso",
          imageUrl: currentExerciseImageUrl,
          nextSetSummary: currentNextSetSummary,
          isResting: true,
          restEndAtMs: endTime,
        });
      }

      if (restTimerNotificationsEnabled) {
        const notificationId = await notificationService.startRestTimer(
          newTime,
          currentExerciseName,
          endTime
        );
        setActiveNotificationId(notificationId);
      }
    },
    [
      currentExerciseName,
      currentExerciseImageUrl,
      currentNextSetSummary,
      getWorkoutStartTime,
      restTimerNotificationsEnabled,
      startRestCountdownInterval,
    ]
  );

  const handleAddRestTime = useCallback(async () => {
    await applyRestTimerDelta(15, true);
  }, [applyRestTimerDelta]);

  const handleSubtractRestTime = useCallback(async () => {
    await applyRestTimerDelta(-15, true);
  }, [applyRestTimerDelta]);

  const handleCancelRestTimer = useCallback(
    async (syncNativeLiveActivity = true) => {
      clearRestCountdownInterval();
      if (activeNotificationId) {
        await notificationService.cancelRestTimer(activeNotificationId);
        setActiveNotificationId(null);
      }
      setRestTimerEndTime(null);
      restTimerEndTimeRef.current = null;
      setShowRestToast(false);
      setCurrentExerciseImageUrl(null);
      setCurrentNextSetSummary(null);
      if (syncNativeLiveActivity) {
        void updateWorkoutLive({
          workoutStartedAtMs: getWorkoutStartTime(),
          exerciseName: currentExerciseNameRef.current ?? "Entrenamiento",
          isResting: false,
          restEndAtMs: null,
        });
      }
    },
    [activeNotificationId, clearRestCountdownInterval, getWorkoutStartTime]
  );

  const handleCompleteSetFromLive = useCallback(async () => {
    if (!started || isSaving) return;

    const next = findNextIncompleteSet({
      exercises: exercisesState,
      sets,
      preferredExerciseId: liveExerciseIdRef.current,
    });
    if (!next) return;

    liveExerciseIdRef.current = next.exerciseId;
    setCurrentExerciseName(next.exerciseName);
    currentExerciseNameRef.current = next.exerciseName;

    const exercise = exercisesState.find((e) => e.id === next.exerciseId);
    const imageUrl = exercise ? getStaticExerciseImageUrl(exercise) : null;
    setCurrentExerciseImageUrl(imageUrl);

    setSets((prev) => {
      const list = prev[next.exerciseId] || [];
      return {
        ...prev,
        [next.exerciseId]: list.map((s) =>
          s.id === next.set.id ? { ...s, completed: true } : s
        ),
      };
    });

    const updatedList = (sets[next.exerciseId] || []).map((s) =>
      s.id === next.set.id ? { ...s, completed: true } : s
    );
    const summary = buildNextSetSummary(updatedList, next.set.id);
    setCurrentNextSetSummary(summary);

    if (next.restSeconds > 0) {
      await handleStartRestTimer(
        next.restSeconds,
        next.exerciseId,
        next.exerciseName,
        imageUrl,
        summary
      );
    } else {
      pushWorkoutLive({
        exerciseName: next.exerciseName,
        imageUrl,
        nextSetSummary: summary,
        isResting: false,
        restEndAtMs: null,
      });
    }
  }, [
    exercisesState,
    handleStartRestTimer,
    isSaving,
    pushWorkoutLive,
    sets,
    started,
  ]);

  const syncRestTimerFromIntent = useCallback(
    async (deltaSeconds: number, endTimestampMs?: number | null) => {
      // Android native already applied the delta; sync toast to its end time.
      // If endTimestampMs is missing, apply the delta locally (iOS URL path).
      const resolvedEndMs =
        typeof endTimestampMs === "number" && Number.isFinite(endTimestampMs)
          ? endTimestampMs
          : Date.now() +
            Math.max(
              0,
              (restTimerEndTimeRef.current
                ? Math.floor(
                    (restTimerEndTimeRef.current - Date.now()) / 1000
                  )
                : restTimeRemainingRef.current) + deltaSeconds
            ) *
              1000;

      if (resolvedEndMs <= Date.now()) {
        await handleCancelRestTimer(false);
        return;
      }

      const newTime = Math.max(
        0,
        Math.floor((resolvedEndMs - Date.now()) / 1000)
      );

      setRestTimeRemaining(newTime);
      setTotalRestTime((prev) =>
        Math.max(newTime, Math.max(0, prev + deltaSeconds))
      );
      setRestTimerEndTime(resolvedEndMs);
      restTimerEndTimeRef.current = resolvedEndMs;
      startRestCountdownInterval();

      // Native already updated on Android intents; only push live update when
      // the end time came from JS (no native endTimestampMs).
      if (
        !(typeof endTimestampMs === "number" && Number.isFinite(endTimestampMs))
      ) {
        await updateWorkoutLive({
          workoutStartedAtMs: getWorkoutStartTime(),
          exerciseName: currentExerciseName ?? "Descanso",
          imageUrl: currentExerciseImageUrl,
          nextSetSummary: currentNextSetSummary,
          isResting: true,
          restEndAtMs: resolvedEndMs,
        });
      }

      if (restTimerNotificationsEnabled) {
        const notificationId = await notificationService.startRestTimer(
          newTime,
          currentExerciseName,
          resolvedEndMs
        );
        setActiveNotificationId(notificationId);
      }
    },
    [
      currentExerciseName,
      currentExerciseImageUrl,
      currentNextSetSummary,
      getWorkoutStartTime,
      handleCancelRestTimer,
      restTimerNotificationsEnabled,
      startRestCountdownInterval,
    ]
  );

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
            previousAssistedReps: (set as SetWithPreviousAssisted).assistedReps,
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

    const health = healthSnapshotRef.current;
    return {
      totalTime: frozenDuration || durationRef.current,
      totalWeight: volume,
      completedSets,
      avgHeartRate: health?.avgHeartRate ?? null,
      maxHeartRate: health?.maxHeartRate ?? null,
      caloriesBurned: health?.caloriesBurned ?? null,
      healthMetricsSource:
        !health || health.source === "unavailable" ? null : health.source,
      exercises: exercisesState.map((exercise) => ({
        exerciseId: exercise.id,
        name: exercise.name,
        exerciseName: exercise.name,
        // Prefer static thumbnail so history summaries don't go blank after GIF filtering.
        imageUrl:
          getStaticExerciseImageUrl(exercise) ?? exercise.imageUrl ?? undefined,
        giftUrl:
          (
            exercise as ExerciseRequestDto & {
              giftUrl?: string;
              gifUrl?: string;
            }
          ).giftUrl ||
          (
            exercise as ExerciseRequestDto & {
              giftUrl?: string;
              gifUrl?: string;
            }
          ).gifUrl,
        restSeconds: exercise.restSeconds,
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
            setType:
              (
                s as SetRequestDto & {
                  setType?: "warmup" | "normal" | "failed" | "drop";
                }
              ).setType || "normal",
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
    ({
      item,
      drag,
      isActive,
    }: {
      item: ExerciseRequestDto;
      drag?: () => void;
      isActive?: boolean;
    }) => {
      if (reorderMode) {
        return (
          <ScaleDecorator>
            <TouchableOpacity
              onLongPress={drag}
              disabled={isActive}
              style={{
                opacity: isActive ? 0.9 : 1,
                marginBottom: 12,
              }}
            >
              <View
                style={[
                  styles.reorderCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Icon name="drag-indicator" size={24} color={theme.textTertiary} />
                <CachedExerciseImage
                  imageUrl={getStaticExerciseImageUrl(item)}
                  style={styles.reorderImage}
                />
                <Text
                  style={[styles.reorderName, { color: theme.text }]}
                  numberOfLines={2}
                >
                  {item.name}
                </Text>
              </View>
            </TouchableOpacity>
          </ScaleDecorator>
        );
      }

      const supersetExercise = item.supersetWith
        ? exercisesState.find((ex) => ex.id === item.supersetWith)
        : null;

      return (
        <ExerciseCard
          exercise={item}
          initialSets={sets[item.id] || []}
          onChangeSets={(updatedSets) =>
            handleChangeSetsForExercise(item.id, updatedSets)
          }
          onChangeExercise={handleChangeExercise}
          readonly={Boolean(sessionView || (readonly && !started))}
          started={started}
          onStartRestTimer={handleStartRestTimer}
          onCancelRestTimer={handleCancelRestTimer}
          onShowUndoSnackbar={handleShowUndoSnackbar}
          showOptions={canReorderExercises}
          onTitleLongPress={
            canReorderExercises && drag
              ? () => handleExerciseLongPress(drag)
              : undefined
          }
          isDragging={Boolean(isActive)}
          onReorder={handleReorderFromHeader}
          onReplace={() => handleReplaceExercise(item.id)}
          onDelete={() => handleDeleteExercise(item.id)}
          onAddSuperset={(targetId) => handleAddSuperset(item.id, targetId)}
          onRemoveSuperset={() => handleRemoveSuperset(item.id)}
          availableExercises={exercisesState}
          supersetWith={item.supersetWith}
          supersetExerciseName={supersetExercise?.name}
          previousSessions={previousSessions}
        />
      );
    },
    [
      exercisesState,
      previousSessions,
      readonly,
      started,
      sessionView,
      sets,
      reorderMode,
      canReorderExercises,
      theme,
      handleStartRestTimer,
      handleCancelRestTimer,
      handleShowUndoSnackbar,
      handleChangeSetsForExercise,
      handleChangeExercise,
      handleExerciseLongPress,
      handleReorderFromHeader,
      handleReplaceExercise,
      handleDeleteExercise,
      handleAddSuperset,
      handleRemoveSuperset,
    ]
  );

  useEffect(() => {
    const unsubscribe = subscribeToWorkoutLiveIntents(
      async ({ action, delta, endTimestampMs, source }) => {
        switch (action) {
          case "add":
            if (source === "url") {
              await handleAddRestTime();
            } else {
              await syncRestTimerFromIntent(delta, endTimestampMs);
            }
            break;

          case "subtract":
            if (source === "url") {
              await handleSubtractRestTime();
            } else {
              await syncRestTimerFromIntent(delta, endTimestampMs);
            }
            break;

          case "skip":
            await handleCancelRestTimer(source !== "intent");
            break;

          case "completeSet":
            await handleCompleteSetFromLive();
            break;
        }
      }
    );

    return unsubscribe;
  }, [
    handleAddRestTime,
    handleCancelRestTimer,
    handleCompleteSetFromLive,
    handleSubtractRestTime,
    syncRestTimerFromIntent,
  ]);

  // Hide floating keyboard-dismiss while rest toast sits above the keyboard.
  useEffect(() => {
    const active = showRestToast && keyboardHeight > 0;
    setRestToastKeyboardActive(active);
    return () => {
      setRestToastKeyboardActive(false);
    };
  }, [showRestToast, keyboardHeight]);

  const toastBottom =
    keyboardHeight > 0
      ? keyboardHeight + 8
      : Math.max(insets.bottom, 12) + 8;

  const isSmallDevice = width < 360;
  const loadingTextMaxWidth = Math.min(width * 0.8, 360);

  if (loading || isExercisesLoading) {
    return (
      <SafeAreaView
        style={[
          styles.safeArea,
          { backgroundColor: theme.backgroundSecondary },
        ]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size={isSmallDevice ? "small" : "large"}
            color={theme.primary}
          />
          <Text
            style={[
              styles.loadingText,
              {
                color: theme.textSecondary,
                maxWidth: loadingTextMaxWidth,
                fontSize: RFValue(isSmallDevice ? 14 : 16),
              },
            ]}
          >
            Cargando ejercicios...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.safeArea, { backgroundColor: theme.backgroundSecondary }]}
    >
      {started && (
        <LiveRoutineMetrics
          getStartTime={getWorkoutStartTime}
          timerPaused={showShortWorkoutModal || isSaving}
          volume={volume}
          completedSets={completedSets}
          records={sessionRecordsCount}
          onDurationSample={handleDurationSample}
          onFinish={() => {
            if (isSaving) return;
            handleFinishAndSaveRoutine();
          }}
        />
      )}

      {started && !sessionView && (
        <LiveWorkoutHealthPanel
          enabled
          getStartTime={getWorkoutStartTime}
          getDurationSeconds={getDurationSeconds}
          onSnapshotChange={handleHealthSnapshotChange}
        />
      )}

      {reorderMode && reorderFromButton && (
        <View
          style={[
            styles.reorderBar,
            {
              backgroundColor: theme.card,
              borderBottomColor: theme.border,
              top: started ? 120 : 0,
            },
          ]}
        >
          <Text style={[styles.reorderHintText, { color: theme.textSecondary }]}>
            Arrastra para reordenar
          </Text>
          <TouchableOpacity
            style={[styles.reorderDoneButton, { backgroundColor: theme.primary }]}
            onPress={handleConfirmReorder}
          >
            <Icon name="check" size={18} color="#fff" />
            <Text style={styles.reorderDoneText}>Listo</Text>
          </TouchableOpacity>
        </View>
      )}

      {canReorderExercises || reorderMode ? (
        <DraggableFlatList
          data={reorderFromButton ? tempExercisesOrder : exercisesState}
          keyExtractor={(item) => item.id}
          onDragEnd={({ data }) => handleReorderComplete(data)}
          activationDistance={16}
          ListHeaderComponent={
            <RoutineHeader
              routineTitle={routineTitle}
              subtitle={sessionView ? sessionDateLabel : undefined}
              started={started}
              routineId={routineData?.id}
              onStart={handleStartRoutine}
              onEdit={goToEditRoutine}
              onChangeTitle={setRoutineTitle}
              readonly={readonly}
              hideActions={Boolean(sessionView) || reorderMode}
            />
          }
          renderItem={({ item, drag, isActive }: RenderItemParams<ExerciseRequestDto>) =>
            renderExerciseCard({ item, drag, isActive })
          }
          contentContainerStyle={{
            paddingTop: started
              ? reorderFromButton
                ? 170
                : 120
              : reorderFromButton
                ? 56
                : 0,
            padding: 16,
          }}
        />
      ) : (
        <FlatList
          data={exercisesState}
          scrollEnabled={!isSaving}
          keyExtractor={(item) => item.id}
          initialNumToRender={4}
          maxToRenderPerBatch={5}
          windowSize={7}
          removeClippedSubviews
          ListHeaderComponent={
            <RoutineHeader
              routineTitle={routineTitle}
              subtitle={sessionView ? sessionDateLabel : undefined}
              started={started}
              routineId={routineData?.id}
              onStart={handleStartRoutine}
              onEdit={goToEditRoutine}
              onChangeTitle={setRoutineTitle}
              readonly={readonly}
              hideActions={Boolean(sessionView)}
            />
          }
          renderItem={({ item }) => renderExerciseCard({ item })}
          contentContainerStyle={{ paddingTop: started ? 120 : 0, padding: 16 }}
        />
      )}

      {!sessionView && !routineData?.id && !started && !reorderMode && (
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.primary }]}
          disabled={isSaving}
          onPress={handleSaveRoutine}
        >
          <Text style={styles.saveButtonText}>Guardar rutina</Text>
        </TouchableOpacity>
      )}

      {showRestToast && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.toastContainer,
            {
              bottom: toastBottom,
              elevation: 24,
              zIndex: 9999,
            },
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <CustomToast
            text1={formatTime({
              minutes: Math.floor(restTimeRemaining / 60),
              seconds: restTimeRemaining % 60,
            })}
            text2={currentExerciseName}
            progress={
              totalRestTime > 0 ? restTimeRemaining / totalRestTime : 0
            }
            onCancel={handleCancelRestTimer}
            onAddTime={handleAddRestTime}
            onSubtractTime={handleSubtractRestTime}
            onDismissKeyboard={
              keyboardHeight > 0
                ? () => {
                    Keyboard.dismiss();
                  }
                : undefined
            }
          />
        </Animated.View>
      )}

      <ShortWorkoutConfirmModal
        visible={showShortWorkoutModal}
        duration={frozenDuration}
        onContinue={() => setShowShortWorkoutModal(false)}
        onDiscard={handleDiscardWorkout}
        onSave={() => {
          if (isSaving) return;
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

      <Modal
        visible={isSaving}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => {
          // Bloquear cierre por botón físico mientras se guarda.
        }}
      >
        <View style={styles.savingOverlay}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.savingText, { color: theme.text }]}>
            Guardando rutina...
          </Text>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingText: {
    textAlign: "center",
    marginTop: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
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
    zIndex: 9999,
  },
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2000,
  },
  savingText: {
    marginTop: 12,
    fontSize: RFValue(14),
    fontWeight: "600",
  },
  reorderBar: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  reorderHintText: {
    fontSize: RFValue(12),
    flex: 1,
    marginRight: 12,
  },
  reorderDoneButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  reorderDoneText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: RFValue(13),
  },
  reorderCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  reorderImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  reorderName: {
    flex: 1,
    fontSize: RFValue(14),
    fontWeight: "600",
  },
});
