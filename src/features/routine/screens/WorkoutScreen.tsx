import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
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

type WorkoutScreenNavigationProp = NativeStackNavigationProp<
  WorkoutStackParamList,
  "WorkoutList"
>;

export default function WorkoutScreen() {
  const navigation = useNavigation<WorkoutScreenNavigationProp>();
  const { width } = useWindowDimensions();

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
      }))
    );
  const [showWorkoutBanner, setShowWorkoutBanner] = useState(false);

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

  // Función para cargar y ordenar rutinas
  const fetchRoutines = useCallback(async () => {
    try {
      const data = await findAllRoutines();

      // Ordenar rutinas por fecha de creación (más recientes primero)
      const sortedRoutines = data.sort(
        (
          a: { createdAt: any; creationDate: any },
          b: { createdAt: any; creationDate: any }
        ) => {
          // Convertir las fechas a timestamps para comparar
          const dateA = new Date(
            a.createdAt || a.creationDate || Date.now()
          ).getTime();
          const dateB = new Date(
            b.createdAt || b.creationDate || Date.now()
          ).getTime();

          // Orden descendente (más recientes primero)
          return dateB - dateA;
        }
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
    }, [fetchRoutines])
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
    action: "duplicate" | "delete" | "edit"
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
    <View style={{ flex: 1, backgroundColor: "#F4F4F8" }}>
      {/* Encabezado */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Rutinas de entrenamiento</Text>
        <Text style={styles.headerSubtitle}>
          Selecciona una rutina para comenzar o crea una nueva
        </Text>
      </View>

      {/* Botón principal */}
      <View style={styles.topActions}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            navigation.navigate("ExerciseList", {
              onFinishSelection: (selectedExercises: ExerciseRequestDto[]) => {
                // lógica para crear nueva rutina
              },
            });
          }}
        >
          <MaterialIcons name="add" size={22} color="#fff" />
          <Text style={styles.addButtonText}>Crear nueva rutina</Text>
        </TouchableOpacity>
      </View>

      {/* Listado de rutinas con RefreshControl */}
      <ScrollView
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#6C3BAA"]}
            tintColor="#6C3BAA"
          />
        }
      >
        {loading ? (
          <Text style={{ textAlign: "center", marginTop: 40 }}>
            Cargando rutinas...
          </Text>
        ) : routines.length === 0 ? (
          <Text style={{ textAlign: "center", marginTop: 40, color: "#888" }}>
            No tienes rutinas guardadas.
          </Text>
        ) : (
          routines.map((routine) => (
            <View key={routine.id} style={styles.routineCard}>
              <TouchableOpacity
                style={styles.moreButton}
                onPress={() => openRoutineOptions(routine)}
              >
                <MaterialIcons name="more-vert" size={20} color="#6C3BAA" />
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
                <Text style={styles.routineName}>{routine.title}</Text>
                {/* Opcional: Mostrar fecha de creación */}
                {routine.createdAt && (
                  <Text style={styles.routineDate}>
                    Creada: {new Date(routine.createdAt).toLocaleDateString()}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.startRoutineButton}
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
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Acciones de rutina</Text>
          <TouchableOpacity
            style={styles.modalItem}
            onPress={() => handleRoutineAction("duplicate")}
          >
            <MaterialIcons name="content-copy" size={20} color="#4E2A84" />
            <Text style={styles.modalItemText}>Duplicar rutina</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.modalItem}
            onPress={() => handleRoutineAction("edit")}
          >
            <MaterialIcons name="edit" size={20} color="#4E2A84" />
            <Text style={styles.modalItemText}>Editar rutina</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.modalItem}
            onPress={() => handleRoutineAction("delete")}
          >
            <MaterialIcons name="delete" size={20} color="red" />
            <Text style={[styles.modalItemText, { color: "red" }]}>
              Borrar rutina
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Banner de entrenamiento en progreso */}
      {showWorkoutBanner && workoutInProgress && (
        <View style={styles.workoutBannerModern}>
          <Text style={styles.workoutBannerTextModern}>
            🏋️ Entrenamiento en progreso: {workoutInProgress.routineTitle}
          </Text>
          <View style={styles.workoutBannerActions}>
            <Pressable
              style={({ pressed }) => [
                styles.bannerButton,
                styles.resumeButtonModern,
                pressed && { opacity: 0.7 },
              ]}
              onPress={handleResumeWorkout}
            >
              <Text style={[styles.bannerButtonText, { color: "#B8FFB0" }]}>
                Reanudar
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.bannerButton,
                styles.discardButtonModern,
                pressed && { opacity: 0.7 },
              ]}
              onPress={handleDiscardWorkout}
            >
              <Text style={[styles.bannerButtonText, { color: "#FF8A80" }]}>
                Descartar
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 32,
    paddingBottom: 16,
    paddingHorizontal: 24,
    backgroundColor: "#F4F4F8",
  },
  headerTitle: {
    fontSize: RFValue(22),
    fontWeight: "bold",
    color: "#4E2A84",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: RFValue(15),
    color: "#666",
  },
  topActions: {
    paddingHorizontal: 24,
    marginBottom: 10,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6C3BAA",
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
    paddingBottom: 40,
  },
  routineCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
    position: "relative",
  },
  routineName: {
    fontSize: RFValue(18),
    fontWeight: "600",
    color: "#222",
    marginBottom: 6,
  },
  routineDate: {
    fontSize: RFValue(12),
    color: "#888",
    fontStyle: "italic",
  },
  startRoutineButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6C3BAA",
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
    backgroundColor: "#fff",
    padding: 24,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalTitle: {
    fontSize: RFValue(16),
    fontWeight: "600",
    color: "#4E2A84",
    marginBottom: 18,
    textAlign: "center",
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },
  modalItemText: {
    fontSize: RFValue(16),
    color: "#333",
  },
  workoutBanner: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#6C3BAA",
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 1000,
  },
  workoutBannerText: {
    color: "white",
    fontWeight: "bold",
    flex: 1,
  },
  workoutBannerButtons: {
    flexDirection: "row",
  },
  resumeButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 8,
  },
  resumeButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  discardButton: {
    backgroundColor: "#F44336",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  discardButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  workoutBannerModern: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: "#6C3BAA",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  workoutBannerTextModern: {
    flex: 1,
    color: "#fff",
    fontWeight: "600",
    fontSize: RFValue(15),
    marginRight: 12,
  },
  workoutBannerActions: {
    flexDirection: "row",
    gap: 8, // Para RN >=0.71, si no, usar marginLeft en botones
  },
  bannerButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  resumeButtonModern: {
    backgroundColor: "#4CAF50",
  },
  discardButtonModern: {
    backgroundColor: "#F44336",
  },
  bannerButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: RFValue(14),
    textAlign: "center",
  },
});
