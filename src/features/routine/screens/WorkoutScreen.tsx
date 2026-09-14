import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
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
  TouchableOpacity,
  View,
} from "react-native";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import type { RoutineResponseDto } from "@sergiomesasyelamos2000/shared";
import { WorkoutStackParamList } from "./WorkoutStack";

import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Modal from "react-native-modal";
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { RFValue } from "react-native-responsive-fontsize";
import { useShallow } from "zustand/react/shallow";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWorkoutInProgressStore } from "../../../store/useWorkoutInProgressStore";
import { consumeAppTerminatedAt } from "../../../services/restTimerLiveService";
import { notificationService } from "../../../services/notificationService";
import { CaughtError, getErrorMessage } from "../../../types";
import { canCreateRoutine } from "../../../utils/subscriptionHelpers";
import {
  deleteRoutine,
  duplicateRoutine,
  findAllRoutines,
  getRoutineById,
  reorderRoutines,
} from "../services/routineService";

type WorkoutScreenNavigationProp = NativeStackNavigationProp<
  WorkoutStackParamList,
  "WorkoutList"
>;

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
  const [isActionModalVisible, setActionModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState<string | null>(
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
  const [showWorkoutBanner, setShowWorkoutBanner] = useState(false);
  const prefetchedRoutineIdsRef = useRef<Set<string>>(new Set());
  const [pendingTerminationAt, setPendingTerminationAt] = useState<
    number | null
  >(null);
  const hasConsumedTerminationMarkerRef = useRef(false);

  const styles = useMemo(() => createStyles(theme), [theme]);

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

  // Elimina el useFocusEffect existente y reemplázalo con:
  useEffect(() => {
    const checkWorkoutState = async () => {
      try {
        // Verificar directamente en AsyncStorage
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
      // Limpieza cuando el componente se desmonta
      setShowWorkoutBanner(false);
    };
  }, []);

  const handleResumeWorkout = () => {
    if (workoutInProgress) {
      navigation.navigate("RoutineDetail", {
        routineId: workoutInProgress.routineId, // Pasar solo el ID
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
          // Ignore prefetch errors; detail screen will handle fallback fetch.
          prefetchedRoutineIdsRef.current.delete(item.id);
        });
    });
  }, []);

  // Función para cargar rutinas (el orden viene del servidor vía sortOrder)
  const fetchRoutines = useCallback(async () => {
    try {
      const data = await findAllRoutines();
      setRoutines(data);
      prefetchRoutineDetails(data);
    } catch (err) {
      console.error("Error fetching routines", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [prefetchRoutineDetails]);

  // Cargar rutinas cuando se enfoca la pantalla
  useFocusEffect(
    useCallback(() => {
      fetchRoutines();
    }, [fetchRoutines])
  );

  // Función para el pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRoutines();
  }, [fetchRoutines]);

  const handleReorderRoutines = useCallback(
    async (data: RoutineResponseDto[]) => {
      const previous = routines;
      const next = data.map((routine, index) => ({
        ...routine,
        sortOrder: index,
      }));
      setRoutines(next);

      try {
        await reorderRoutines(next.map((routine) => routine.id));
      } catch (error: CaughtError) {
        setRoutines(previous);
        Alert.alert(
          "Error",
          getErrorMessage(error) ||
            "No se pudo guardar el nuevo orden. Inténtalo de nuevo."
        );
      }
    },
    [routines]
  );

  const openRoutineOptions = (routine: RoutineResponseDto) => {
    setSelectedRoutine(routine);
    setActionModalVisible(true);
  };

  const closeRoutineOptions = () => {
    setSelectedRoutine(null);
    setActionModalVisible(false);
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
    [fetchRoutines]
  );

  // Centraliza las acciones del modal
  const handleRoutineAction = (action: "duplicate" | "delete" | "edit") => {
    if (!selectedRoutine || processingMessage) return;

    const routine = selectedRoutine;

    if (action === "edit") {
      closeRoutineOptions();
      navigation.navigate("RoutineEdit", { id: routine.id });
      return;
    }

    if (action === "delete") {
      closeRoutineOptions();
      // Esperar a que cierre el modal de acciones para evitar conflicto con Alert en Android.
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

  return (
    <View
      style={[
        { flex: 1, backgroundColor: theme.backgroundSecondary },
        Platform.OS === "android" ? { paddingTop: insets.top } : null,
      ]}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={theme.backgroundSecondary}
        hidden={false}
        translucent={false}
      />
      {/* Encabezado */}
      <View
        style={[
          styles.header,
          { backgroundColor: theme.backgroundSecondary },
          Platform.OS === "android" ? styles.headerAndroid : null,
        ]}
      >
        <Text style={[styles.headerTitle, { color: theme.primary }]}>
          Rutinas de entrenamiento
        </Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
          Selecciona una rutina para comenzar o crea una nueva
        </Text>
        <Text style={[styles.reorderHint, { color: theme.textTertiary }]}>
          Mantén pulsado el icono ≡ para reordenar
        </Text>
      </View>

      {/* Botón principal */}
      <View style={styles.topActions}>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          onPress={() => {
            // Verificar límite de rutinas antes de permitir crear
            if (canCreateRoutine(routines.length, navigation)) {
              navigation.navigate("ExerciseList", {
                mode: "createRoutine",
              });
            }
          }}
        >
          <MaterialIcons name="add" size={22} color="#fff" />
          <Text style={styles.addButtonText}>Crear nueva rutina</Text>
        </TouchableOpacity>
      </View>

      {/* Listado de rutinas con drag-and-drop */}
      {loading ? (
        <Text style={{ textAlign: "center", marginTop: 40, color: theme.text }}>
          Cargando rutinas...
        </Text>
      ) : routines.length === 0 ? (
        <Text
          style={{
            textAlign: "center",
            marginTop: 40,
            color: theme.textSecondary,
          }}
        >
          No tienes rutinas guardadas.
        </Text>
      ) : (
        <View style={styles.listWrapper}>
          <DraggableFlatList
            data={routines}
            keyExtractor={(item) => item.id}
            activationDistance={12}
            onDragEnd={({ data }) => {
              void handleReorderRoutines(data);
            }}
            refreshControl={
              <RefreshControl
                key="workout-refresh-purple"
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#6C3BAA"
                titleColor="#6C3BAA"
                colors={["#6C3BAA"]}
                progressBackgroundColor="#FFFFFF"
              />
            }
            contentContainerStyle={[
              styles.listContent,
              showWorkoutBanner && styles.listContentWithBanner,
            ]}
            renderItem={({
              item: routine,
              drag,
              isActive,
            }: RenderItemParams<RoutineResponseDto>) => (
              <ScaleDecorator>
                <View
                  style={[
                    styles.routineCard,
                    {
                      backgroundColor: theme.card,
                      shadowColor: theme.shadowColor,
                      borderWidth: isDark ? 1 : 0,
                      borderColor: theme.border,
                      opacity: isActive ? 0.92 : 1,
                      elevation: isActive ? 6 : 2,
                    },
                  ]}
                >
                <TouchableOpacity
                  style={styles.dragHandle}
                  onLongPress={drag}
                  delayLongPress={180}
                  disabled={Boolean(processingMessage)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Reordenar rutina"
                  accessibilityHint="Mantén pulsado y arrastra para cambiar el orden"
                >
                  <MaterialIcons
                    name="drag-indicator"
                    size={22}
                    color={theme.textTertiary}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.moreButton}
                  onPress={() => openRoutineOptions(routine)}
                  disabled={Boolean(processingMessage)}
                >
                  <MaterialIcons
                    name="more-vert"
                    size={20}
                    color={theme.primary}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.routineBody}
                  activeOpacity={0.8}
                  onPress={() =>
                    navigation.navigate("RoutineDetail", {
                      routineId: routine.id,
                      routine: routineDetailsById[routine.id] ?? routine,
                    })
                  }
                >
                  <Text style={[styles.routineName, { color: theme.text }]}>
                    {routine.title}
                  </Text>
                  {routine.createdAt && (
                    <Text
                      style={[
                        styles.routineDate,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Creada:{" "}
                      {new Date(routine.createdAt).toLocaleDateString()}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.startRoutineButton,
                    { backgroundColor: theme.primary },
                  ]}
                  onPress={() =>
                    navigation.navigate("RoutineDetail", {
                      routineId: routine.id,
                      routine: routineDetailsById[routine.id] ?? routine,
                      start: true,
                    })
                  }
                >
                  <Text style={styles.startRoutineButtonText}>
                    Iniciar rutina
                  </Text>
                </TouchableOpacity>
              </View>
              </ScaleDecorator>
            )}
          />
        </View>
      )}

      {/* Modal de acciones */}
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
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Acciones de rutina</Text>
            <TouchableOpacity onPress={closeRoutineOptions}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.modalOption}
            onPress={() => handleRoutineAction("duplicate")}
            disabled={Boolean(processingMessage)}
          >
            <View style={styles.modalOptionLeft}>
              <MaterialIcons
                name="content-copy"
                size={24}
                color={theme.primary}
              />
              <Text style={styles.modalOptionText}>Duplicar rutina</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.modalOption}
            onPress={() => handleRoutineAction("edit")}
            disabled={Boolean(processingMessage)}
          >
            <View style={styles.modalOptionLeft}>
              <MaterialIcons name="edit" size={24} color={theme.primary} />
              <Text style={styles.modalOptionText}>Editar rutina</Text>
            </View>
          </TouchableOpacity>
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

      <RNModal
        visible={Boolean(processingMessage)}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => {
          // Bloquear cierre mientras se procesa la acción.
        }}
      >
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.processingText, { color: theme.text }]}>
            {processingMessage}
          </Text>
        </View>
      </RNModal>

      {/* Banner de entrenamiento en progreso - MEJORADO */}
      {showWorkoutBanner && workoutInProgress && (
        <View style={styles.workoutBannerContainer}>
          <View
            style={[
              styles.workoutBanner,
              { backgroundColor: theme.primaryDark, borderColor: theme.border },
            ]}
          >
            {/* Icono y texto */}
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

            {/* Botones */}
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
                  style={[
                    styles.resumeButtonText,
                    { color: theme.onPrimary },
                  ]}
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
    header: {
      paddingTop: 32,
      paddingBottom: 16,
      paddingHorizontal: 24,
    },
    headerAndroid: {
      paddingTop: 10,
    },
    headerTitle: {
      fontSize: RFValue(22),
      fontWeight: "bold",
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: RFValue(15),
    },
    reorderHint: {
      fontSize: RFValue(12),
      marginTop: 6,
    },
    topActions: {
      paddingHorizontal: 24,
      marginBottom: 10,
    },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 18,
      borderRadius: 10,
      alignSelf: "flex-start",
      marginTop: 8,
    },
    addButtonText: {
      color: "#fff",
      fontSize: RFValue(16),
      fontWeight: "bold",
      marginLeft: 8,
    },
    listWrapper: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 20,
    },
    listContentWithBanner: {
      paddingBottom: 100, // Espacio extra cuando el banner está visible
    },
    routineCard: {
      borderRadius: 14,
      padding: 18,
      paddingLeft: 44,
      marginBottom: 16,
      shadowOpacity: 0.04,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
      elevation: 2,
      position: "relative",
    },
    dragHandle: {
      position: "absolute",
      left: 8,
      top: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
      width: 32,
      zIndex: 10,
    },
    routineBody: {
      flex: 1,
      paddingRight: 28,
    },
    routineName: {
      fontSize: RFValue(18),
      fontWeight: "600",
      marginBottom: 6,
    },
    routineDate: {
      fontSize: RFValue(12),
      fontStyle: "italic",
    },
    startRoutineButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 8,
      alignSelf: "flex-start",
      marginTop: 8,
    },
    startRoutineButtonText: {
      color: "#fff",
      fontWeight: "600",
      fontSize: RFValue(15),
      marginLeft: 4,
    },
    moreButton: {
      position: "absolute",
      right: 10,
      top: 10,
      padding: 6,
      zIndex: 10,
    },
    modalContainer: {
      justifyContent: "flex-end",
      margin: 0,
    },
    modalContent: {
      backgroundColor: theme.card,
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
      borderBottomColor: theme.border,
    },
    modalTitle: {
      fontSize: RFValue(18),
      fontWeight: "700",
      color: theme.text,
    },
    modalOption: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.backgroundSecondary,
    },
    modalOptionLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    modalOptionText: {
      fontSize: RFValue(15),
      fontWeight: "600",
      color: theme.text,
    },

    // Banner mejorado
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
      shadowOffset: {
        width: 0,
        height: 4,
      },
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
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
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
