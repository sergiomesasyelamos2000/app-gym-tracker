import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RoutineResponseDto } from "@sergiomesasyelamos2000/shared";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Modal as RNModal,
  Platform,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Modal from "react-native-modal";
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { RFValue } from "react-native-responsive-fontsize";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useShallow } from "zustand/react/shallow";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import { notificationService } from "../../../services/notificationService";
import { consumeAppTerminatedAt } from "../../../services/restTimerLiveService";
import {
  folderKey,
  parseRootKey,
  routineKey,
  useRoutineFolderStore,
  type RootKey,
  type RoutineFolder,
} from "../../../store/useRoutineFolderStore";
import { useWorkoutInProgressStore } from "../../../store/useWorkoutInProgressStore";
import { CaughtError, getErrorMessage } from "../../../types";
import { canCreateRoutine } from "../../../utils/subscriptionHelpers";
import {
  createRoutineFolder,
  deleteRoutine,
  deleteRoutineFolder,
  duplicateRoutine,
  fetchRoutineFolders,
  findAllRoutines,
  getRoutineById,
  renameRoutineFolder,
  saveRoutineLayout,
} from "../services/routineService";
import { WorkoutStackParamList } from "./WorkoutStack";

type WorkoutScreenNavigationProp = NativeStackNavigationProp<
  WorkoutStackParamList,
  "WorkoutList"
>;

type ListItem =
  | { key: string; type: "routine"; routine: RoutineResponseDto }
  | { key: string; type: "folder"; folder: RoutineFolder }
  | {
      key: string;
      type: "nested";
      folderId: string;
      routine: RoutineResponseDto;
    };

const FOLDER_HOVER_MS = 400;

function getRoutineExercisePreview(
  routine: RoutineResponseDto,
  details?: RoutineResponseDto
): string {
  const full = details ?? routine;
  const names =
    full.routineExercises
      ?.map((re) => re.exercise?.name)
      .filter((name): name is string => Boolean(name)) ?? [];

  if (names.length > 0) return names.join(", ");

  if (typeof full.totalExercises === "number" && full.totalExercises > 0) {
    return `${full.totalExercises} ejercicio${
      full.totalExercises === 1 ? "" : "s"
    }`;
  }

  return "Sin ejercicios";
}

export default function WorkoutScreen() {
  const navigation = useNavigation<WorkoutScreenNavigationProp>();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [routines, setRoutines] = useState<RoutineResponseDto[]>([]);
  const [routineDetailsById, setRoutineDetailsById] = useState<
    Record<string, RoutineResponseDto>
  >({});
  const [loading, setLoading] = useState(true);
  const [selectedRoutine, setSelectedRoutine] =
    useState<RoutineResponseDto | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<RoutineFolder | null>(
    null
  );
  const [isActionModalVisible, setActionModalVisible] = useState(false);
  const [isFolderModalVisible, setFolderModalVisible] = useState(false);
  const [isRenameModalVisible, setRenameModalVisible] = useState(false);
  const [renameDraft, setRenameDraft] = useState("Grupo");
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameMode, setRenameMode] = useState<"create" | "rename">("rename");
  const [refreshing, setRefreshing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState<string | null>(
    null
  );
  const [folderDropTargetId, setFolderDropTargetId] = useState<string | null>(
    null
  );
  const { workoutInProgress, clearWorkoutInProgress, patchWorkoutInProgress } =
    useWorkoutInProgressStore(
      useShallow((state) => ({
        workoutInProgress: state.workoutInProgress,
        clearWorkoutInProgress: state.clearWorkoutInProgress,
        patchWorkoutInProgress: state.patchWorkoutInProgress,
      }))
    );
  const {
    folders,
    rootOrder,
    expandedFolderIds,
    migratedLocalFolders,
    syncWithRoutines,
    hydrateFromApi,
    markLocalFoldersMigrated,
    insertFolder,
    removeRoutineFromFolder,
    renameFolder,
    dissolveFolder,
    setRootOrder,
    toggleFolderExpanded,
    getFolderIdForRoutine,
  } = useRoutineFolderStore(
    useShallow((state) => ({
      folders: state.folders,
      rootOrder: state.rootOrder,
      expandedFolderIds: state.expandedFolderIds,
      migratedLocalFolders: state.migratedLocalFolders,
      syncWithRoutines: state.syncWithRoutines,
      hydrateFromApi: state.hydrateFromApi,
      markLocalFoldersMigrated: state.markLocalFoldersMigrated,
      insertFolder: state.insertFolder,
      removeRoutineFromFolder: state.removeRoutineFromFolder,
      renameFolder: state.renameFolder,
      dissolveFolder: state.dissolveFolder,
      setRootOrder: state.setRootOrder,
      toggleFolderExpanded: state.toggleFolderExpanded,
      getFolderIdForRoutine: state.getFolderIdForRoutine,
    }))
  );
  const [showWorkoutBanner, setShowWorkoutBanner] = useState(false);
  const prefetchedRoutineIdsRef = useRef<Set<string>>(new Set());
  const [pendingTerminationAt, setPendingTerminationAt] = useState<
    number | null
  >(null);
  const hasConsumedTerminationMarkerRef = useRef(false);
  const listDataRef = useRef<ListItem[]>([]);
  const draggingKeyRef = useRef<string | null>(null);
  const folderHoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const folderDropTargetIdRef = useRef<string | null>(null);

  const styles = useMemo(() => createStyles(theme), [theme]);
  const routinesById = useMemo(() => {
    const map: Record<string, RoutineResponseDto> = {};
    routines.forEach((routine) => {
      map[routine.id] = routine;
    });
    return map;
  }, [routines]);

  // Flatten: folder header + nested routines when expanded (Hevy-style drag).
  const listData = useMemo<ListItem[]>(() => {
    const folderById = new Map(folders.map((folder) => [folder.id, folder]));
    const items: ListItem[] = [];

    rootOrder.forEach((key) => {
      const parsed = parseRootKey(key);
      if (parsed.type === "folder") {
        const folder = folderById.get(parsed.id);
        if (!folder) return;
        items.push({ key, type: "folder", folder });
        if (expandedFolderIds.includes(folder.id)) {
          folder.routineIds.forEach((routineId) => {
            const routine = routinesById[routineId];
            if (!routine) return;
            items.push({
              key: `nested:${folder.id}:${routineId}`,
              type: "nested",
              folderId: folder.id,
              routine,
            });
          });
        }
        return;
      }
      const routine = routinesById[parsed.id];
      if (routine) {
        items.push({ key, type: "routine", routine });
      }
    });

    return items;
  }, [folders, rootOrder, routinesById, expandedFolderIds]);

  listDataRef.current = listData;
  folderDropTargetIdRef.current = folderDropTargetId;

  useEffect(() => {
    if (hasConsumedTerminationMarkerRef.current) return;
    hasConsumedTerminationMarkerRef.current = true;

    consumeAppTerminatedAt().then((terminatedAt) => {
      if (!terminatedAt) return;
      setPendingTerminationAt(terminatedAt);
    });
  }, []);

  useEffect(() => {
    const terminatedAt = pendingTerminationAt;
    if (!terminatedAt || !workoutInProgress || workoutInProgress.pausedAt) {
      return;
    }

    const durationAtTermination = Math.max(
      workoutInProgress.duration,
      Math.floor((terminatedAt - workoutInProgress.startedAt) / 1000)
    );

    patchWorkoutInProgress({
      duration: durationAtTermination,
      pausedAt: terminatedAt,
    });
    void notificationService.cancelAllRestTimers();
    setPendingTerminationAt(null);
  }, [pendingTerminationAt, workoutInProgress, patchWorkoutInProgress]);

  useEffect(() => {
    const checkWorkoutState = async () => {
      try {
        const stored = await AsyncStorage.getItem(
          "workout-in-progress-storage"
        );
        if (!stored) {
          setShowWorkoutBanner(false);
          return;
        }

        const parsed = JSON.parse(stored);
        setShowWorkoutBanner(!!parsed.state.workoutInProgress);
      } catch (error) {
        console.error("Error checking workout state:", error);
        setShowWorkoutBanner(false);
      }
    };

    checkWorkoutState();
  }, [workoutInProgress]);

  useEffect(() => {
    return () => {
      setShowWorkoutBanner(false);
      if (folderHoverTimerRef.current) clearTimeout(folderHoverTimerRef.current);
    };
  }, []);

  const handleResumeWorkout = () => {
    if (workoutInProgress) {
      navigation.navigate("RoutineDetail", {
        routineId: workoutInProgress.routineId,
        start: true,
      });
    }
  };

  const handleDiscardWorkout = () => {
    clearWorkoutInProgress();
    setShowWorkoutBanner(false);
  };

  const prefetchRoutineDetails = useCallback((items: RoutineResponseDto[]) => {
    items.slice(0, 8).forEach((item) => {
      if (prefetchedRoutineIdsRef.current.has(item.id)) return;
      prefetchedRoutineIdsRef.current.add(item.id);

      getRoutineById(item.id)
        .then((fullRoutine) => {
          setRoutineDetailsById((prev) => {
            if (prev[item.id]) return prev;
            return { ...prev, [item.id]: fullRoutine };
          });
        })
        .catch(() => {
          prefetchedRoutineIdsRef.current.delete(item.id);
        });
    });
  }, []);

  const buildRootOrderFromApi = useCallback(
    (
      routinesList: RoutineResponseDto[],
      apiFolders: Array<{
        id: string;
        title: string;
        sortOrder: number;
        routineIds: string[];
      }>
    ): { folders: RoutineFolder[]; rootOrder: RootKey[] } => {
      const folderModels: RoutineFolder[] = apiFolders.map((folder) => ({
        id: folder.id,
        title: folder.title,
        routineIds: [...folder.routineIds],
      }));

      type RootEntry =
        | { type: "folder"; id: string; sortOrder: number }
        | { type: "routine"; id: string; sortOrder: number };

      const entries: RootEntry[] = [
        ...apiFolders.map((folder) => ({
          type: "folder" as const,
          id: folder.id,
          sortOrder: folder.sortOrder,
        })),
        ...routinesList
          .filter((routine) => !routine.folderId)
          .map((routine) => ({
            type: "routine" as const,
            id: routine.id,
            sortOrder: routine.sortOrder ?? 0,
          })),
      ];

      entries.sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
        return a.id.localeCompare(b.id);
      });

      return {
        folders: folderModels,
        rootOrder: entries.map((entry) =>
          entry.type === "folder" ? folderKey(entry.id) : routineKey(entry.id)
        ),
      };
    },
    []
  );

  const persistRoutineLayout = useCallback(
    async (nextRootOrder: RootKey[], nextFolders: RoutineFolder[]) => {
      const layoutFolders = nextFolders.map((folder) => ({
        id: folder.id,
        title: folder.title,
        routineIds: folder.routineIds,
      }));

      const layoutRoot = nextRootOrder.map((key) => {
        const parsed = parseRootKey(key);
        return { type: parsed.type, id: parsed.id };
      });

      // Ensure every owned routine is represented (API requires full coverage).
      const mentioned = new Set<string>();
      layoutRoot.forEach((item) => {
        if (item.type === "routine") mentioned.add(item.id);
      });
      layoutFolders.forEach((folder) => {
        folder.routineIds.forEach((id) => mentioned.add(id));
      });
      routines.forEach((routine) => {
        if (!mentioned.has(routine.id)) {
          layoutRoot.push({ type: "routine", id: routine.id });
        }
      });

      try {
        await saveRoutineLayout({
          rootOrder: layoutRoot,
          folders: layoutFolders,
        });
      } catch (error: CaughtError) {
        Alert.alert(
          "Error",
          getErrorMessage(error) ||
            "No se pudo guardar el orden de rutinas. Inténtalo de nuevo."
        );
      }
    },
    [routines]
  );

  const fetchRoutines = useCallback(async () => {
    try {
      const [data, apiFolders] = await Promise.all([
        findAllRoutines(),
        fetchRoutineFolders(),
      ]);

      const localState = useRoutineFolderStore.getState();
      const shouldMigrate =
        !localState.migratedLocalFolders &&
        apiFolders.length === 0 &&
        localState.folders.length > 0;

      if (shouldMigrate) {
        try {
          const idMap = new Map<string, string>();
          for (const localFolder of localState.folders) {
            const created = await createRoutineFolder(localFolder.title);
            idMap.set(localFolder.id, created.id);
          }

          const migratedFolders = localState.folders.map((folder) => ({
            id: idMap.get(folder.id)!,
            title: folder.title,
            routineIds: folder.routineIds.filter((id) =>
              data.some((routine) => routine.id === id)
            ),
          }));

          const migratedRoot = localState.rootOrder
            .map((key) => {
              const parsed = parseRootKey(key);
              if (parsed.type === "folder") {
                const newId = idMap.get(parsed.id);
                return newId
                  ? { type: "folder" as const, id: newId }
                  : null;
              }
              if (!data.some((routine) => routine.id === parsed.id)) return null;
              if (
                migratedFolders.some((f) => f.routineIds.includes(parsed.id))
              ) {
                return null;
              }
              return { type: "routine" as const, id: parsed.id };
            })
            .filter(
              (item): item is { type: "routine" | "folder"; id: string } =>
                Boolean(item)
            );

          migratedFolders.forEach((folder) => {
            if (!migratedRoot.some((item) => item.type === "folder" && item.id === folder.id)) {
              migratedRoot.push({ type: "folder", id: folder.id });
            }
          });
          data.forEach((routine) => {
            const inFolder = migratedFolders.some((f) =>
              f.routineIds.includes(routine.id)
            );
            if (
              !inFolder &&
              !migratedRoot.some(
                (item) => item.type === "routine" && item.id === routine.id
              )
            ) {
              migratedRoot.push({ type: "routine", id: routine.id });
            }
          });

          await saveRoutineLayout({
            rootOrder: migratedRoot,
            folders: migratedFolders,
          });
          markLocalFoldersMigrated();

          const refreshedFolders = await fetchRoutineFolders();
          const hydrated = buildRootOrderFromApi(data, refreshedFolders);
          setRoutines(data);
          hydrateFromApi(hydrated.folders, hydrated.rootOrder);
          prefetchRoutineDetails(data);
          return;
        } catch (migrationError) {
          console.error("Folder migration failed", migrationError);
          // Fall through to normal hydrate / local sync.
        }
      }

      if (apiFolders.length > 0 || localState.migratedLocalFolders) {
        const hydrated = buildRootOrderFromApi(data, apiFolders);
        setRoutines(data);
        hydrateFromApi(hydrated.folders, hydrated.rootOrder);
        if (!localState.migratedLocalFolders) {
          markLocalFoldersMigrated();
        }
      } else {
        setRoutines(data);
        syncWithRoutines(data.map((routine) => routine.id));
      }
      prefetchRoutineDetails(data);
    } catch (err) {
      console.error("Error fetching routines", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    buildRootOrderFromApi,
    hydrateFromApi,
    markLocalFoldersMigrated,
    prefetchRoutineDetails,
    syncWithRoutines,
  ]);

  useFocusEffect(
    useCallback(() => {
      fetchRoutines();
    }, [fetchRoutines])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRoutines();
  }, [fetchRoutines]);

  const clearFolderHover = useCallback(() => {
    if (folderHoverTimerRef.current) {
      clearTimeout(folderHoverTimerRef.current);
      folderHoverTimerRef.current = null;
    }
    setFolderDropTargetId(null);
    folderDropTargetIdRef.current = null;
  }, []);

  const openCreateFolderModal = () => {
    setRenameMode("create");
    setRenameFolderId(null);
    setRenameDraft("Grupo");
    setRenameModalVisible(true);
  };

  const openRenameFolder = (folderId: string, currentTitle: string) => {
    setRenameMode("rename");
    setRenameFolderId(folderId);
    setRenameDraft(currentTitle || "Grupo");
    setRenameModalVisible(true);
  };

  const closeRenameFolderModal = () => {
    setRenameModalVisible(false);
    setRenameFolderId(null);
    setRenameMode("rename");
  };

  const applyFlatListToStore = useCallback(
    (data: ListItem[], options?: { forceAddToFolderId?: string | null }) => {
      const nextFolderContents = new Map<string, string[]>();
      folders.forEach((folder) => nextFolderContents.set(folder.id, []));

      const nextRootOrder: RootKey[] = [];
      let i = 0;

      while (i < data.length) {
        const item = data[i];

        if (item.type === "folder") {
          nextRootOrder.push(folderKey(item.folder.id));
          if (!nextFolderContents.has(item.folder.id)) {
            nextFolderContents.set(item.folder.id, []);
          }
          let j = i + 1;
          while (j < data.length && data[j].type === "nested") {
            const nested = data[j] as Extract<ListItem, { type: "nested" }>;
            if (nested.folderId !== item.folder.id) break;
            nextFolderContents.get(item.folder.id)!.push(nested.routine.id);
            j += 1;
          }
          i = j;
          continue;
        }

        if (item.type === "nested") {
          // Orphaned nested (dragged out of its folder block) → root.
          nextRootOrder.push(routineKey(item.routine.id));
          i += 1;
          continue;
        }

        nextRootOrder.push(routineKey(item.routine.id));
        i += 1;
      }

      const forceFolderId = options?.forceAddToFolderId;
      const draggedKey = draggingKeyRef.current;
      if (forceFolderId && draggedKey) {
        const draggedItem = listDataRef.current.find((row) => row.key === draggedKey);
        const routineId =
          draggedItem?.type === "routine" || draggedItem?.type === "nested"
            ? draggedItem.routine.id
            : null;

        if (routineId) {
          // Remove from all folders / root, then append to target folder.
          nextFolderContents.forEach((ids, id) => {
            nextFolderContents.set(
              id,
              ids.filter((rid) => rid !== routineId)
            );
          });
          const filteredRoot = nextRootOrder.filter(
            (key) => key !== routineKey(routineId)
          );
          nextRootOrder.length = 0;
          nextRootOrder.push(...filteredRoot);
          const targetIds = nextFolderContents.get(forceFolderId) ?? [];
          if (!targetIds.includes(routineId)) {
            targetIds.push(routineId);
          }
          nextFolderContents.set(forceFolderId, targetIds);
          if (!nextRootOrder.includes(folderKey(forceFolderId))) {
            nextRootOrder.unshift(folderKey(forceFolderId));
          }
        }
      }

      const nextFolders = folders.map((folder) => ({
        ...folder,
        routineIds: nextFolderContents.get(folder.id) ?? [],
      }));

      setRootOrder(nextRootOrder);
      useRoutineFolderStore.setState({ folders: nextFolders });

      const orderedIds: string[] = [];
      nextRootOrder.forEach((key) => {
        const parsed = parseRootKey(key);
        if (parsed.type === "routine") {
          orderedIds.push(parsed.id);
          return;
        }
        (nextFolderContents.get(parsed.id) ?? []).forEach((id) =>
          orderedIds.push(id)
        );
      });

      setRoutines((prev) => {
        const byId = new Map(prev.map((routine) => [routine.id, routine]));
        const next: RoutineResponseDto[] = [];
        orderedIds.forEach((id, index) => {
          const routine = byId.get(id);
          if (!routine) return;
          next.push({ ...routine, sortOrder: index });
        });
        prev.forEach((routine) => {
          if (!orderedIds.includes(routine.id)) next.push(routine);
        });
        return next;
      });

      void persistRoutineLayout(nextRootOrder, nextFolders);
    },
    [folders, persistRoutineLayout, setRootOrder]
  );

  const handleRootDragEnd = useCallback(
    ({ data, from, to }: { data: ListItem[]; from: number; to: number }) => {
      const dropFolderId = folderDropTargetIdRef.current;
      clearFolderHover();

      const draggedKey = draggingKeyRef.current;
      const draggedItem = listDataRef.current.find((row) => row.key === draggedKey);
      const canDropOnFolder =
        Boolean(dropFolderId) &&
        (draggedItem?.type === "routine" || draggedItem?.type === "nested");

      if (from === to && !canDropOnFolder) {
        draggingKeyRef.current = null;
        return;
      }

      applyFlatListToStore(data, {
        forceAddToFolderId: canDropOnFolder ? dropFolderId : null,
      });
      draggingKeyRef.current = null;
    },
    [applyFlatListToStore, clearFolderHover]
  );

  const openRoutineOptions = (routine: RoutineResponseDto) => {
    setSelectedRoutine(routine);
    setActionModalVisible(true);
  };

  const closeRoutineOptions = () => {
    setSelectedRoutine(null);
    setActionModalVisible(false);
  };

  const openFolderOptions = (folder: RoutineFolder) => {
    setSelectedFolder(folder);
    setFolderModalVisible(true);
  };

  const closeFolderOptions = () => {
    setSelectedFolder(null);
    setFolderModalVisible(false);
  };

  const performRoutineMutation = useCallback(
    async (action: "duplicate" | "delete", routine: RoutineResponseDto) => {
      setProcessingMessage(
        action === "duplicate" ? "Duplicando rutina..." : "Eliminando rutina..."
      );

      try {
        if (action === "duplicate") {
          await duplicateRoutine(routine.id);
        } else {
          await deleteRoutine(routine.id);
          removeRoutineFromFolder(routine.id);
        }
        await fetchRoutines();
      } catch (error: CaughtError) {
        Alert.alert(
          "Error",
          getErrorMessage(error) ||
            (action === "duplicate"
              ? "No se pudo duplicar la rutina. Inténtalo de nuevo."
              : "No se pudo eliminar la rutina. Inténtalo de nuevo.")
        );
      } finally {
        setProcessingMessage(null);
      }
    },
    [fetchRoutines, removeRoutineFromFolder]
  );

  const handleRoutineAction = (
    action: "duplicate" | "delete" | "edit" | "ungroup"
  ) => {
    if (!selectedRoutine || processingMessage) return;
    const routine = selectedRoutine;

    if (action === "edit") {
      closeRoutineOptions();
      navigation.navigate("RoutineEdit", { id: routine.id });
      return;
    }

    if (action === "ungroup") {
      closeRoutineOptions();
      removeRoutineFromFolder(routine.id);
      const state = useRoutineFolderStore.getState();
      void persistRoutineLayout(state.rootOrder, state.folders);
      return;
    }

    if (action === "delete") {
      closeRoutineOptions();
      setTimeout(() => {
        Alert.alert(
          "Eliminar rutina",
          `¿Estás seguro de que deseas eliminar "${routine.title}"? Esta acción no se puede deshacer.`,
          [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Eliminar",
              style: "destructive",
              onPress: () => {
                void performRoutineMutation("delete", routine);
              },
            },
          ]
        );
      }, 300);
      return;
    }

    closeRoutineOptions();
    void performRoutineMutation("duplicate", routine);
  };

  const handleCreateRoutine = () => {
    if (canCreateRoutine(routines.length, navigation)) {
      navigation.navigate("ExerciseList", {
        mode: "createRoutine",
      });
    }
  };

  const selectedRoutineFolderId = selectedRoutine
    ? getFolderIdForRoutine(selectedRoutine.id)
    : null;

  const renderRoutineCard = (
    routine: RoutineResponseDto,
    options: {
      drag?: () => void;
      isActive?: boolean;
      nested?: boolean;
      isLastNested?: boolean;
    } = {}
  ) => {
    const details = routineDetailsById[routine.id];
    const preview = getRoutineExercisePreview(routine, details);
    const nested = Boolean(options.nested);

    return (
      <View
        style={[
          styles.routineCard,
          nested && styles.nestedRoutineCard,
          nested && options.isLastNested && styles.nestedRoutineCardLast,
          {
            backgroundColor: nested
              ? isDark
                ? theme.surfaceElevated
                : theme.backgroundSecondary
              : theme.card,
            borderColor: nested ? "transparent" : theme.border,
            borderWidth: nested ? 0 : 1,
            shadowColor: theme.shadowColor,
            opacity: options.isActive ? 0.94 : 1,
            elevation: options.isActive ? 6 : nested ? 0 : 0,
            shadowOpacity: nested ? 0 : 0.03,
          },
        ]}
      >
        <View style={styles.cardTopRow}>
          {options.drag ? (
            <TouchableOpacity
              style={styles.dragHandle}
              onLongPress={options.drag}
              delayLongPress={180}
              disabled={Boolean(processingMessage)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Reordenar rutina"
              accessibilityHint="Mantén pulsado y arrastra para cambiar el orden o soltar sobre un grupo"
            >
              <MaterialIcons
                name="drag-indicator"
                size={20}
                color={theme.textTertiary}
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.dragHandleSpacer} />
          )}

          <TouchableOpacity
            style={styles.routineBody}
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate("RoutineDetail", {
                routineId: routine.id,
                routine: details ?? routine,
              })
            }
          >
            <Text
              style={[
                nested ? styles.nestedRoutineName : styles.routineName,
                { color: theme.text },
              ]}
              numberOfLines={2}
            >
              {routine.title}
            </Text>
            <Text
              style={[
                nested ? styles.nestedRoutinePreview : styles.routinePreview,
                { color: theme.textSecondary },
              ]}
              numberOfLines={nested ? 1 : 2}
            >
              {preview}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moreButton}
            onPress={() => openRoutineOptions(routine)}
            disabled={Boolean(processingMessage)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons
              name="more-horiz"
              size={22}
              color={theme.textTertiary}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            nested ? styles.nestedStartButton : styles.startRoutineButton,
            {
              backgroundColor: nested ? theme.selection : theme.primary,
            },
          ]}
          onPress={() =>
            navigation.navigate("RoutineDetail", {
              routineId: routine.id,
              routine: details ?? routine,
              start: true,
            })
          }
          activeOpacity={0.9}
        >
          <Text
            style={[
              nested
                ? styles.nestedStartButtonText
                : styles.startRoutineButtonText,
              { color: nested ? theme.primary : theme.onPrimary },
            ]}
          >
            {nested ? "Empezar" : "Empezar rutina"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const listHeader = (
    <View>
      <View style={styles.screenHeader}>
        <Text style={[styles.screenTitle, { color: theme.text }]}>
          Entrenamiento
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.createCard,
          {
            backgroundColor: isDark ? theme.surfaceElevated : theme.divider,
          },
        ]}
        onPress={handleCreateRoutine}
        activeOpacity={0.85}
      >
        <MaterialIcons name="add" size={22} color={theme.primary} />
        <Text style={[styles.createCardText, { color: theme.text }]}>
          Nueva rutina
        </Text>
      </TouchableOpacity>

      <View style={styles.sectionRow}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Mis rutinas
          {!loading && routines.length > 0 ? ` (${routines.length})` : ""}
        </Text>
        <TouchableOpacity
          onPress={openCreateFolderModal}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Crear grupo de rutinas"
          style={[styles.folderCreateBtn, { backgroundColor: theme.selection }]}
        >
          <MaterialIcons
            name="create-new-folder"
            size={20}
            color={theme.primary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Cargando rutinas...
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <View style={[styles.emptyIconWrap, { backgroundColor: theme.selection }]}>
          <MaterialIcons name="fitness-center" size={28} color={theme.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: theme.text }]}>
          Aún no tienes rutinas
        </Text>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          Crea tu primera rutina para empezar a entrenar
        </Text>
        <TouchableOpacity
          style={[styles.emptyCta, { backgroundColor: theme.primary }]}
          onPress={handleCreateRoutine}
          activeOpacity={0.9}
        >
          <Text style={[styles.emptyCtaText, { color: theme.onPrimary }]}>
            Crear rutina
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View
      style={[
        { flex: 1, backgroundColor: theme.backgroundSecondary },
        Platform.OS === "android"
          ? { paddingTop: insets.top }
          : { paddingTop: Math.max(insets.top, 8) },
      ]}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={theme.backgroundSecondary}
        hidden={false}
        translucent={false}
      />

      <View style={styles.listWrapper}>
        <DraggableFlatList
          data={loading || listData.length === 0 ? [] : listData}
          keyExtractor={(item) => item.key}
          activationDistance={12}
          onDragBegin={(index) => {
            draggingKeyRef.current = listDataRef.current[index]?.key ?? null;
            clearFolderHover();
          }}
          onPlaceholderIndexChange={(index) => {
            if (folderHoverTimerRef.current) {
              clearTimeout(folderHoverTimerRef.current);
              folderHoverTimerRef.current = null;
            }
            setFolderDropTargetId(null);
            folderDropTargetIdRef.current = null;

            const item = listDataRef.current[index];
            const dragged = listDataRef.current.find(
              (row) => row.key === draggingKeyRef.current
            );
            const canHoverFolder =
              item?.type === "folder" &&
              (dragged?.type === "routine" || dragged?.type === "nested") &&
              item.key !== draggingKeyRef.current;

            if (!canHoverFolder || !item || item.type !== "folder") return;

            folderHoverTimerRef.current = setTimeout(() => {
              setFolderDropTargetId(item.folder.id);
              folderDropTargetIdRef.current = item.folder.id;
            }, FOLDER_HOVER_MS);
          }}
          onDragEnd={({ data, from, to }) => {
            handleRootDragEnd({ data, from, to });
          }}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              key="workout-refresh-purple"
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
              titleColor={theme.primary}
              colors={[theme.primary]}
              progressBackgroundColor={theme.card}
            />
          }
          contentContainerStyle={[
            styles.listContent,
            showWorkoutBanner && styles.listContentWithBanner,
            (loading || listData.length === 0) && styles.listContentEmpty,
          ]}
          renderItem={({
            item,
            drag,
            isActive,
          }: RenderItemParams<ListItem>) => {
            if (item.type === "folder") {
              const isDropTarget = folderDropTargetId === item.folder.id;
              const isExpanded = expandedFolderIds.includes(item.folder.id);
              const count = item.folder.routineIds.length;
              const showEmptyHint = isExpanded && count === 0;

              return (
                <ScaleDecorator>
                  <View
                    style={[
                      styles.folderCard,
                      isExpanded && styles.folderCardExpanded,
                      {
                        backgroundColor: isDropTarget
                          ? theme.selection
                          : isDark
                            ? theme.surfaceElevated
                            : theme.backgroundSecondary,
                        borderColor: isDropTarget
                          ? theme.primary
                          : "transparent",
                        opacity: isActive ? 0.94 : 1,
                      },
                    ]}
                  >
                    <View style={styles.folderHeader}>
                      <TouchableOpacity
                        style={styles.dragHandle}
                        onLongPress={drag}
                        delayLongPress={180}
                        disabled={Boolean(processingMessage)}
                        accessibilityLabel="Reordenar grupo"
                      >
                        <MaterialIcons
                          name="drag-indicator"
                          size={20}
                          color={theme.textTertiary}
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.folderHeaderBody}
                        onPress={() => toggleFolderExpanded(item.folder.id)}
                        activeOpacity={0.75}
                      >
                        <MaterialIcons
                          name={isExpanded ? "folder-open" : "folder"}
                          size={22}
                          color={theme.primary}
                        />
                        <View style={styles.folderTextWrap}>
                          <Text
                            style={[styles.folderTitle, { color: theme.text }]}
                            numberOfLines={1}
                          >
                            {item.folder.title}
                          </Text>
                          {isDropTarget ? (
                            <Text
                              style={[
                                styles.folderDropHint,
                                { color: theme.primary },
                              ]}
                            >
                              Soltar para añadir
                            </Text>
                          ) : null}
                        </View>
                        <View
                          style={[
                            styles.folderCountBadge,
                            { backgroundColor: theme.selection },
                          ]}
                        >
                          <Text
                            style={[
                              styles.folderCountText,
                              { color: theme.primary },
                            ]}
                          >
                            {count}
                          </Text>
                        </View>
                        <MaterialIcons
                          name={isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                          size={22}
                          color={theme.textTertiary}
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.moreButton}
                        onPress={() => openFolderOptions(item.folder)}
                      >
                        <MaterialIcons
                          name="more-horiz"
                          size={22}
                          color={theme.textTertiary}
                        />
                      </TouchableOpacity>
                    </View>

                    {showEmptyHint ? (
                      <Text
                        style={[
                          styles.folderEmptyHint,
                          { color: theme.textTertiary },
                        ]}
                      >
                        Arrastra rutinas aquí para agruparlas
                      </Text>
                    ) : null}
                  </View>
                </ScaleDecorator>
              );
            }

            if (item.type === "nested") {
              const folder = folders.find((f) => f.id === item.folderId);
              const isLastNested =
                !!folder &&
                folder.routineIds[folder.routineIds.length - 1] ===
                  item.routine.id;

              return (
                <ScaleDecorator>
                  <View
                    style={[
                      styles.nestedListWrap,
                      {
                        backgroundColor: isDark
                          ? theme.surfaceElevated
                          : theme.backgroundSecondary,
                        borderLeftColor: theme.primary,
                      },
                      isLastNested && styles.nestedListWrapLast,
                    ]}
                  >
                    {renderRoutineCard(item.routine, {
                      drag,
                      isActive,
                      nested: true,
                      isLastNested,
                    })}
                  </View>
                </ScaleDecorator>
              );
            }

            return (
              <ScaleDecorator>
                {renderRoutineCard(item.routine, {
                  drag,
                  isActive,
                })}
              </ScaleDecorator>
            );
          }}
        />
      </View>

      <Modal
        isVisible={isActionModalVisible}
        onBackdropPress={closeRoutineOptions}
        onSwipeComplete={closeRoutineOptions}
        swipeDirection="down"
        style={styles.modalContainer}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        backdropColor={theme.shadowColor}
        backdropOpacity={0.5}
        backdropTransitionOutTiming={0}
        useNativeDriver
        statusBarTranslucent={Platform.OS === "android"}
      >
        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          <View
            style={[styles.modalHeader, { borderBottomColor: theme.border }]}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Acciones de rutina
            </Text>
            <TouchableOpacity onPress={closeRoutineOptions}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[
              styles.modalOption,
              { borderBottomColor: theme.backgroundSecondary },
            ]}
            onPress={() => handleRoutineAction("duplicate")}
            disabled={Boolean(processingMessage)}
          >
            <View style={styles.modalOptionLeft}>
              <MaterialIcons
                name="content-copy"
                size={24}
                color={theme.primary}
              />
              <Text style={[styles.modalOptionText, { color: theme.text }]}>
                Duplicar rutina
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modalOption,
              { borderBottomColor: theme.backgroundSecondary },
            ]}
            onPress={() => handleRoutineAction("edit")}
            disabled={Boolean(processingMessage)}
          >
            <View style={styles.modalOptionLeft}>
              <MaterialIcons name="edit" size={24} color={theme.primary} />
              <Text style={[styles.modalOptionText, { color: theme.text }]}>
                Editar rutina
              </Text>
            </View>
          </TouchableOpacity>
          {selectedRoutineFolderId ? (
            <TouchableOpacity
              style={[
                styles.modalOption,
                { borderBottomColor: theme.backgroundSecondary },
              ]}
              onPress={() => handleRoutineAction("ungroup")}
            >
              <View style={styles.modalOptionLeft}>
                <MaterialIcons
                  name="drive-file-move-outline"
                  size={24}
                  color={theme.primary}
                />
                <Text style={[styles.modalOptionText, { color: theme.text }]}>
                  Sacar del grupo
                </Text>
              </View>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.modalOption}
            onPress={() => handleRoutineAction("delete")}
            disabled={Boolean(processingMessage)}
          >
            <View style={styles.modalOptionLeft}>
              <MaterialIcons name="delete" size={24} color={theme.error} />
              <Text style={[styles.modalOptionText, { color: theme.error }]}>
                Borrar rutina
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal
        isVisible={isFolderModalVisible}
        onBackdropPress={closeFolderOptions}
        onSwipeComplete={closeFolderOptions}
        swipeDirection="down"
        style={styles.modalContainer}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        backdropColor={theme.shadowColor}
        backdropOpacity={0.5}
        backdropTransitionOutTiming={0}
        useNativeDriver
        statusBarTranslucent={Platform.OS === "android"}
      >
        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          <View
            style={[styles.modalHeader, { borderBottomColor: theme.border }]}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Acciones del grupo
            </Text>
            <TouchableOpacity onPress={closeFolderOptions}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[
              styles.modalOption,
              { borderBottomColor: theme.backgroundSecondary },
            ]}
            onPress={() => {
              if (!selectedFolder) return;
              const folder = selectedFolder;
              closeFolderOptions();
              openRenameFolder(folder.id, folder.title);
            }}
          >
            <View style={styles.modalOptionLeft}>
              <MaterialIcons name="edit" size={24} color={theme.primary} />
              <Text style={[styles.modalOptionText, { color: theme.text }]}>
                Renombrar grupo
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.modalOption}
            onPress={() => {
              if (!selectedFolder) return;
              const folder = selectedFolder;
              closeFolderOptions();
              void (async () => {
                try {
                  await deleteRoutineFolder(folder.id);
                  dissolveFolder(folder.id);
                } catch (error: CaughtError) {
                  Alert.alert(
                    "Error",
                    getErrorMessage(error) ||
                      "No se pudo deshacer el grupo. Inténtalo de nuevo."
                  );
                }
              })();
            }}
          >
            <View style={styles.modalOptionLeft}>
              <MaterialIcons name="folder-off" size={24} color={theme.error} />
              <Text style={[styles.modalOptionText, { color: theme.error }]}>
                Deshacer grupo
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>

      <RNModal
        visible={isRenameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeRenameFolderModal}
      >
        <View style={styles.renameOverlay}>
          <View style={[styles.renameCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.renameTitle, { color: theme.text }]}>
              {renameMode === "create" ? "Nuevo grupo" : "Nombre del grupo"}
            </Text>
            <TextInput
              value={renameDraft}
              onChangeText={setRenameDraft}
              autoFocus
              placeholder="Grupo"
              placeholderTextColor={theme.inputPlaceholder}
              style={[
                styles.renameInput,
                {
                  color: theme.text,
                  borderColor: theme.inputBorder,
                  backgroundColor: theme.inputBackground,
                },
              ]}
            />
            <View style={styles.renameActions}>
              <TouchableOpacity
                onPress={closeRenameFolderModal}
                style={styles.renameButton}
              >
                <Text style={{ color: theme.textSecondary, fontWeight: "600" }}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  void (async () => {
                    try {
                      if (renameMode === "create") {
                        const created = await createRoutineFolder(renameDraft);
                        insertFolder({
                          id: created.id,
                          title: created.title,
                          routineIds: created.routineIds ?? [],
                        });
                      } else if (renameFolderId) {
                        await renameRoutineFolder(renameFolderId, renameDraft);
                        renameFolder(renameFolderId, renameDraft);
                      }
                      closeRenameFolderModal();
                    } catch (error: CaughtError) {
                      Alert.alert(
                        "Error",
                        getErrorMessage(error) ||
                          "No se pudo guardar el grupo. Inténtalo de nuevo."
                      );
                    }
                  })();
                }}
                style={[
                  styles.renameButton,
                  styles.renameSave,
                  { backgroundColor: theme.primary },
                ]}
              >
                <Text style={{ color: theme.onPrimary, fontWeight: "700" }}>
                  Guardar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </RNModal>

      <RNModal
        visible={Boolean(processingMessage)}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.processingText, { color: theme.text }]}>
            {processingMessage}
          </Text>
        </View>
      </RNModal>

      {showWorkoutBanner && workoutInProgress && (
        <View style={styles.workoutBannerContainer}>
          <View
            style={[
              styles.workoutBanner,
              { backgroundColor: theme.primaryDark, borderColor: theme.border },
            ]}
          >
            <View style={styles.bannerContent}>
              <View style={styles.bannerIcon}>
                <MaterialIcons name="fitness-center" size={20} color="#fff" />
              </View>
              <View style={styles.bannerTextContainer}>
                <Text style={styles.bannerTitle}>
                  Entrenamiento en progreso
                </Text>
                <Text
                  style={styles.bannerRoutineName}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {workoutInProgress.routineTitle}
                </Text>
              </View>
            </View>

            <View style={styles.bannerActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.bannerButton,
                  styles.discardButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleDiscardWorkout}
              >
                <MaterialIcons name="close" size={16} color={theme.error} />
                <Text
                  style={[styles.discardButtonText, { color: theme.error }]}
                >
                  Descartar
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.bannerButton,
                  styles.resumeButton,
                  { backgroundColor: theme.primary },
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleResumeWorkout}
              >
                <MaterialIcons name="play-arrow" size={18} color="#fff" />
                <Text
                  style={[styles.resumeButtonText, { color: theme.onPrimary }]}
                >
                  Reanudar
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screenHeader: {
      paddingTop: 8,
      paddingBottom: 16,
    },
    screenTitle: {
      fontSize: RFValue(28),
      fontWeight: "800",
      letterSpacing: -0.4,
    },
    createCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderRadius: 14,
      paddingVertical: 16,
      marginBottom: 22,
    },
    createCardText: {
      fontSize: RFValue(15),
      fontWeight: "700",
    },
    sectionRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
      gap: 12,
    },
    sectionTitle: {
      fontSize: RFValue(16),
      fontWeight: "700",
      flexShrink: 1,
    },
    folderCreateBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    listWrapper: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 24,
    },
    listContentEmpty: {
      flexGrow: 1,
    },
    listContentWithBanner: {
      paddingBottom: 110,
    },
    routineCard: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
      marginBottom: 12,
      shadowOpacity: 0.03,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 6,
    },
    nestedRoutineCard: {
      marginLeft: 0,
      borderRadius: 12,
      padding: 12,
      marginHorizontal: 10,
      marginTop: 2,
      marginBottom: 8,
    },
    nestedRoutineCardLast: {
      marginBottom: 12,
    },
    nestedListWrap: {
      marginTop: -4,
      marginBottom: 0,
      paddingTop: 4,
      borderLeftWidth: 3,
      marginLeft: 18,
      paddingLeft: 4,
      borderBottomLeftRadius: 0,
    },
    nestedListWrapLast: {
      borderBottomLeftRadius: 14,
      marginBottom: 12,
      paddingBottom: 2,
    },
    folderCard: {
      borderRadius: 14,
      borderWidth: 1.5,
      paddingVertical: 10,
      paddingHorizontal: 8,
      marginBottom: 10,
    },
    folderCardExpanded: {
      marginBottom: 0,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    },
    folderHeader: {
      flexDirection: "row",
      alignItems: "center",
    },
    folderHeaderBody: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      minHeight: 40,
    },
    folderTextWrap: {
      flex: 1,
      minWidth: 0,
    },
    folderTitle: {
      fontSize: RFValue(15),
      fontWeight: "700",
    },
    folderDropHint: {
      fontSize: RFValue(11),
      marginTop: 2,
      fontWeight: "600",
    },
    folderCountBadge: {
      minWidth: 24,
      height: 24,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 6,
    },
    folderCountText: {
      fontSize: RFValue(12),
      fontWeight: "700",
    },
    folderEmptyHint: {
      fontSize: RFValue(12),
      paddingHorizontal: 36,
      paddingTop: 4,
      paddingBottom: 8,
      fontWeight: "500",
    },
    cardTopRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 4,
    },
    dragHandle: {
      paddingTop: 2,
      paddingRight: 2,
      width: 28,
      alignItems: "center",
    },
    dragHandleSpacer: {
      width: 8,
    },
    routineBody: {
      flex: 1,
      paddingRight: 4,
      paddingBottom: 4,
    },
    routineName: {
      fontSize: RFValue(16),
      fontWeight: "700",
      marginBottom: 6,
      lineHeight: RFValue(21),
    },
    nestedRoutineName: {
      fontSize: RFValue(14),
      fontWeight: "700",
      marginBottom: 3,
      lineHeight: RFValue(18),
    },
    routinePreview: {
      fontSize: RFValue(13),
      lineHeight: RFValue(18),
    },
    nestedRoutinePreview: {
      fontSize: RFValue(12),
      lineHeight: RFValue(16),
    },
    moreButton: {
      padding: 2,
      marginTop: -2,
    },
    startRoutineButton: {
      marginTop: 14,
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: "center",
      justifyContent: "center",
    },
    startRoutineButtonText: {
      fontWeight: "700",
      fontSize: RFValue(15),
    },
    nestedStartButton: {
      marginTop: 10,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    nestedStartButtonText: {
      fontWeight: "700",
      fontSize: RFValue(13),
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 28,
      paddingTop: 36,
      paddingBottom: 48,
      gap: 8,
    },
    emptyIconWrap: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    emptyTitle: {
      fontSize: RFValue(17),
      fontWeight: "700",
      textAlign: "center",
    },
    emptyText: {
      fontSize: RFValue(14),
      textAlign: "center",
      lineHeight: RFValue(20),
    },
    emptyCta: {
      marginTop: 14,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 22,
    },
    emptyCtaText: {
      fontSize: RFValue(14),
      fontWeight: "700",
    },
    modalContainer: {
      justifyContent: "flex-end",
      margin: 0,
    },
    modalContent: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: 30,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 20,
      borderBottomWidth: 1,
    },
    modalTitle: {
      fontSize: RFValue(18),
      fontWeight: "700",
    },
    modalOption: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 20,
      borderBottomWidth: 1,
    },
    modalOptionLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    modalOptionText: {
      fontSize: RFValue(15),
      fontWeight: "600",
    },
    renameOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "center",
      paddingHorizontal: 24,
    },
    renameCard: {
      borderRadius: 16,
      padding: 20,
    },
    renameTitle: {
      fontSize: RFValue(17),
      fontWeight: "700",
      marginBottom: 12,
    },
    renameInput: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === "ios" ? 12 : 10,
      fontSize: RFValue(15),
      marginBottom: 16,
    },
    renameActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 10,
    },
    renameButton: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
    },
    renameSave: {
      minWidth: 96,
      alignItems: "center",
    },
    workoutBannerContainer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      padding: 16,
      backgroundColor: "transparent",
      zIndex: 1000,
    },
    workoutBanner: {
      borderRadius: 16,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
      borderWidth: 1,
    },
    bannerContent: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      marginRight: 12,
    },
    bannerIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    bannerTextContainer: {
      flex: 1,
    },
    bannerTitle: {
      fontSize: RFValue(12),
      fontWeight: "600",
      color: theme.onPrimary,
      opacity: 0.8,
      marginBottom: 2,
    },
    bannerRoutineName: {
      fontSize: RFValue(15),
      fontWeight: "700",
      color: theme.onPrimary,
    },
    bannerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    bannerButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 12,
      gap: 6,
      minHeight: 40,
    },
    discardButton: {
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      borderWidth: 1,
      borderColor: "rgba(255, 107, 107, 0.3)",
    },
    discardButtonText: {
      fontSize: RFValue(13),
      fontWeight: "600",
    },
    resumeButton: {
      paddingHorizontal: 16,
    },
    resumeButtonText: {
      fontSize: RFValue(13),
      fontWeight: "700",
    },
    buttonPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.96 }],
    },
    processingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.25)",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 2000,
    },
    processingText: {
      marginTop: 12,
      fontSize: RFValue(14),
      fontWeight: "600",
    },
  });
