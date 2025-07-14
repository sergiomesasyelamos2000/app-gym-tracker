import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChevronRight } from "lucide-react-native";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { ExerciseRequestDto, RoutineResponseDto } from "../models/index.js";
import { WorkoutStackParamList } from "./WorkoutStack";
import { duplicateRoutine, findRoutines } from "../services/routineService";
import { MaterialIcons } from "@expo/vector-icons";
import Modal from "react-native-modal";

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

  const openRoutineOptions = (routine: RoutineResponseDto) => {
    setSelectedRoutine(routine);
    setActionModalVisible(true);
  };

  const closeRoutineOptions = () => {
    setSelectedRoutine(null);
    setActionModalVisible(false);
  };

  useEffect(() => {
    const fetchRoutines = async () => {
      try {
        const data = await findRoutines();
        setRoutines(data);
        console.log("listado de rutinas", data);
      } catch (err) {
        console.error("Error fetching routines", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRoutines();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Modal
        isVisible={isActionModalVisible}
        onBackdropPress={closeRoutineOptions}
        onSwipeComplete={closeRoutineOptions}
        swipeDirection="down"
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHandle} />

          <TouchableOpacity
            style={styles.modalItem}
            onPress={async () => {
              if (selectedRoutine) {
                await duplicateRoutine(selectedRoutine.id);
                closeRoutineOptions();
                // Opcional: refresca la lista de rutinas
                const data = await findRoutines();
                setRoutines(data);
              }
            }}
          >
            <MaterialIcons name="content-copy" size={20} color="#4E2A84" />
            <Text style={styles.modalItemText}>Duplicar rutina</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modalItem}
            onPress={() => {
              console.log("selectedRoutine", selectedRoutine);

              if (selectedRoutine) {
                navigation.navigate("RoutineEdit", { id: selectedRoutine.id });
                closeRoutineOptions();
              }
            }}
          >
            <MaterialIcons name="edit" size={20} color="#4E2A84" />
            <Text style={styles.modalItemText}>Editar rutina</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modalItem}
            onPress={() => {
              // lógica de borrado
              closeRoutineOptions();
            }}
          >
            <MaterialIcons name="delete" size={20} color="red" />
            <Text style={[styles.modalItemText, { color: "red" }]}>
              Borrar rutina
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={[styles.container, { width }]}>
        <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              navigation.navigate("ExerciseList", {
                onFinishSelection: (
                  selectedExercises: ExerciseRequestDto[]
                ) => {
                  /* const newRoutine: RoutineDto = {
                    id: Date.now().toString(),
                    title: "New Routine",
                    createdAt: new Date(),
                    exercises: selectedExercises,
                  };
                  navigation.navigate("RoutineDetail", { routine: newRoutine }); */
                },
              });
            }}
          >
            <Text style={styles.addButtonText}>+ Crear nueva rutina</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Workout Routines</Text>
          <Text style={styles.headerSubtitle}>
            Choose a routine to start your workout
          </Text>
        </View>

        {loading ? (
          <Text>Cargando rutinas...</Text>
        ) : (
          routines.map((routine) => (
            <View key={routine.id} style={styles.routineCard}>
              {/* Botón de opciones */}
              <TouchableOpacity
                style={styles.moreButton}
                onPress={() => openRoutineOptions(routine)}
              >
                <MaterialIcons name="more-vert" size={20} color="#6C3BAA" />
              </TouchableOpacity>

              {/* Contenido de la tarjeta */}
              <TouchableOpacity
                style={{ flex: 1 }}
                activeOpacity={0.8}
                onPress={() =>
                  navigation.navigate("RoutineDetail", { routine })
                }
              >
                <Text style={styles.routineName}>{routine.title}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: "#f9fafb",
    alignItems: "center",
  },
  header: {
    width: "100%",
    marginBottom: 16,
    padding: 20,
    backgroundColor: "#6C3BAA",
    borderRadius: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#E0D7F5",
    marginTop: 6,
  },
  routineCard: {
    width: "100%",
    backgroundColor: "#f5f3fc",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    position: "relative",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  routineInfo: {
    flex: 1,
  },
  routineName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#4E2A84",
    marginBottom: 6,
  },
  routineActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  addButton: {
    backgroundColor: "#6C3BAA",
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    alignItems: "center",
  },
  addButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  startRoutineButton: {
    backgroundColor: "#6C3BAA",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  startRoutineButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  moreButton: {
    position: "absolute",
    right: 12,
    top: 12,
    padding: 6,
    zIndex: 10,
  },
  modalContainer: {
    justifyContent: "flex-end",
    margin: 0,
  },

  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },

  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: "#ccc",
    alignSelf: "center",
    borderRadius: 2.5,
    marginBottom: 10,
  },

  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4E2A84",
    marginBottom: 16,
    textAlign: "center",
  },

  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },

  modalItemText: {
    fontSize: 16,
    color: "#333",
  },
});
