import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useTheme } from "../../../contexts/ThemeContext";
import {
  ExerciseRequestDto,
  RoutineResponseDto,
} from "../../../models/index.js";
import { WorkoutStackParamList } from "./WorkoutStack";

import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Modal from "react-native-modal";
import { RFValue } from "react-native-responsive-fontsize";
import { useShallow } from "zustand/react/shallow";
import { useWorkoutInProgressStore } from "../../../store/useWorkoutInProgressStore";
import {
  deleteRoutine,
  duplicateRoutine,
  findAllRoutines,
} from "../services/routineService";
import { canCreateRoutine } from "../../../utils/subscriptionHelpers";

type WorkoutScreenNavigationProp = NativeStackNavigationProp<
  WorkoutStackParamList,
  "WorkoutList"
>;

export default function WorkoutScreen() {
  const navigation = useNavigation<WorkoutScreenNavigationProp>();
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();

  const [routines, setRoutines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoutine, setSelectedRoutine] =
    useState<RoutineResponseDto | null>(null);
  const [isActionModalVisible, setActionModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { workoutInProgress, clearWorkoutInProgress } =
    useWorkoutInProgressStore(
      useShallow((state) => ({
        workoutInProgress: state.workoutInProgress,
        clearWorkoutInProgress: state.clearWorkoutInProgress,
      })),
    );
  const [showWorkoutBanner, setShowWorkoutBanner] = useState(false);

  const styles = useMemo(() => createStyles(theme), [theme]);

  // Elimina el useFocusEffect existente y reemplázalo con:
  useEffect(() => {
    const checkWorkoutState = async () => {
      try {
        // Verificar directamente en AsyncStorage
        const stored = await AsyncStorage.getItem(
          "workout-in-progress-storage",
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

  // Función para cargar y ordenar rutinas
  const fetchRoutines = useCallback(async () => {
    try {
      const data = await findAllRoutines();

      // Ordenar rutinas por fecha de creación (más recientes primero)
      const sortedRoutines = data.sort(
        (
          a: { createdAt: any; creationDate: any },
          b: { createdAt: any; creationDate: any },
        ) => {
          // Convertir las fechas a timestamps para comparar
          const dateA = new Date(
            a.createdAt || a.creationDate || Date.now(),
          ).getTime();
          const dateB = new Date(
            b.createdAt || b.creationDate || Date.now(),
          ).getTime();

          // Orden descendente (más recientes primero)
          return dateB - dateA;
        },
      );

      setRoutines(sortedRoutines);
    } catch (err) {
      console.error("Error fetching routines", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Cargar rutinas cuando se enfoca la pantalla
  useFocusEffect(
    useCallback(() => {
      fetchRoutines();
    }, [fetchRoutines]),
  );

  // Función para el pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRoutines();
  }, [fetchRoutines]);

  const openRoutineOptions = (routine: RoutineResponseDto) => {
    setSelectedRoutine(routine);
    setActionModalVisible(true);
  };

  const closeRoutineOptions = () => {
    setSelectedRoutine(null);
    setActionModalVisible(false);
  };

  // Centraliza las acciones del modal
  const handleRoutineAction = async (
    action: "duplicate" | "delete" | "edit",
  ) => {
    if (!selectedRoutine) return;
    if (action === "duplicate") {
      await duplicateRoutine(selectedRoutine.id);
      await fetchRoutines(); // Se recargarán y ordenarán automáticamente
      closeRoutineOptions();
    }
    if (action === "delete") {
      await deleteRoutine(selectedRoutine.id);
      await fetchRoutines(); // Se recargarán y ordenarán automáticamente
      closeRoutineOptions();
    }
    if (action === "edit") {
      navigation.navigate("RoutineEdit", { id: selectedRoutine.id });
      closeRoutineOptions();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundSecondary }}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={theme.backgroundSecondary}
      />
      {/* Encabezado */}
      <View
        style={[styles.header, { backgroundColor: theme.backgroundSecondary }]}
      >
        <Text style={[styles.headerTitle, { color: theme.primary }]}>
          Rutinas de entrenamiento
        </Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
          Selecciona una rutina para comenzar o crea una nueva
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
                onFinishSelection: (selectedExercises: ExerciseRequestDto[]) => {
                  console.log('[WorkoutScreen] Creating new routine with exercises:', selectedExercises.length);
                  // Navigate to RoutineDetail with selected exercises to create new routine
                  navigation.navigate("RoutineDetail", {
                    routine: undefined,
                    routineId: undefined,
                    exercises: selectedExercises,
                    start: false,
                  });
                },
              });
            }
          }}
        >
          <MaterialIcons name="add" size={22} color="#fff" />
          <Text style={styles.addButtonText}>Crear nueva rutina</Text>
        </TouchableOpacity>
      </View>

      {/* Listado de rutinas con RefreshControl */}
      <ScrollView
        contentContainerStyle={[
          styles.listContainer,
          showWorkoutBanner && styles.listContainerWithBanner,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
      >
        {loading ? (
          <Text
            style={{ textAlign: "center", marginTop: 40, color: theme.text }}
          >
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
          routines.map((routine) => (
            <View
              key={routine.id}
              style={[
                styles.routineCard,
                {
                  backgroundColor: theme.card,
                  shadowColor: theme.shadowColor,
                  borderWidth: isDark ? 1 : 0,
                  borderColor: theme.border,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.moreButton}
                onPress={() => openRoutineOptions(routine)}
              >
                <MaterialIcons
                  name="more-vert"
                  size={20}
                  color={theme.primary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={{ flex: 1 }}
                activeOpacity={0.8}
                onPress={() =>
                  navigation.navigate("RoutineDetail", {
                    routineId: routine.id,
                  })
                }
              >
                <Text style={[styles.routineName, { color: theme.text }]}>
                  {routine.title}
                </Text>
                {/* Opcional: Mostrar fecha de creación */}
                {routine.createdAt && (
                  <Text
                    style={[styles.routineDate, { color: theme.textSecondary }]}
                  >
                    Creada: {new Date(routine.createdAt).toLocaleDateString()}
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
                    start: true,
                  })
                }
              >
                <Text style={styles.startRoutineButtonText}>
                  Iniciar rutina
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

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
          >
            <View style={styles.modalOptionLeft}>
              <MaterialIcons name="edit" size={24} color={theme.primary} />
              <Text style={styles.modalOptionText}>Editar rutina</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.modalOption}
            onPress={() => handleRoutineAction("delete")}
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
                <Text style={styles.resumeButtonText}>Reanudar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    header: {
      paddingTop: 32,
      paddingBottom: 16,
      paddingHorizontal: 24,
    },
    headerTitle: {
      fontSize: RFValue(22),
      fontWeight: "bold",
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: RFValue(15),
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
    listContainer: {
      paddingHorizontal: 16,
      paddingBottom: 20,
    },
    listContainerWithBanner: {
      paddingBottom: 100, // Espacio extra cuando el banner está visible
    },
    routineCard: {
      borderRadius: 14,
      padding: 18,
      marginBottom: 16,
      shadowOpacity: 0.04,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
      elevation: 2,
      position: "relative",
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
      color: "rgba(255, 255, 255, 0.8)",
      marginBottom: 2,
    },
    bannerRoutineName: {
      fontSize: RFValue(15),
      fontWeight: "700",
      color: "#FFFFFF",
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
      color: "#FFFFFF",
      fontSize: RFValue(13),
      fontWeight: "700",
    },
    buttonPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.96 }],
    },
  });
