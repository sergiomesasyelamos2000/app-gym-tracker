import React, { useEffect, useState, useCallback } from "react";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  RefreshControl,
} from "react-native";
import {
  ExerciseRequestDto,
  RoutineResponseDto,
} from "../../../models/index.js";
import { WorkoutStackParamList } from "./WorkoutStack";

import { MaterialIcons } from "@expo/vector-icons";
import Modal from "react-native-modal";
import {
  deleteRoutine,
  duplicateRoutine,
  findRoutines,
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

  // Función para cargar y ordenar rutinas
  const fetchRoutines = useCallback(async () => {
    try {
      const data = await findRoutines();

      // Ordenar rutinas por fecha de creación (más recientes primero)
      const sortedRoutines = data.sort((a, b) => {
        // Convertir las fechas a timestamps para comparar
        const dateA = new Date(
          a.createdAt || a.creationDate || Date.now()
        ).getTime();
        const dateB = new Date(
          b.createdAt || b.creationDate || Date.now()
        ).getTime();

        // Orden descendente (más recientes primero)
        return dateB - dateA;
      });

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
                  navigation.navigate("RoutineDetail", { routine })
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
                  navigation.navigate("RoutineDetail", { routine, start: true })
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
    fontSize: 22,
    fontWeight: "bold",
    color: "#4E2A84",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
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
    fontSize: 16,
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
    fontSize: 18,
    fontWeight: "600",
    color: "#222",
    marginBottom: 6,
  },
  routineDate: {
    fontSize: 12,
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
    fontSize: 15,
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
    fontSize: 16,
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
    fontSize: 16,
    color: "#333",
  },
});
