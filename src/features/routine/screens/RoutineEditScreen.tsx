import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from "react-native-draggable-flatlist";
import { RFValue } from "react-native-responsive-fontsize";
import Icon from "react-native-vector-icons/MaterialIcons";
import { ExerciseRequestDto, SetRequestDto } from "../../../models";
import ExerciseCard from "../components/ExerciseCard/ExerciseCard";
import { getRoutineById, updateRoutineById } from "../services/routineService";
import { WorkoutStackParamList } from "./WorkoutStack";

export default function RoutineEditScreen() {
  const route = useRoute();
  const navigation =
    useNavigation<NativeStackNavigationProp<WorkoutStackParamList>>();
  const { id, title, exercises, onUpdate } =
    route.params as WorkoutStackParamList["RoutineEdit"];
  const [editTitle, setEditTitle] = React.useState(title);
  const [exercisesState, setExercises] = useState<ExerciseRequestDto[]>(
    exercises || []
  );
  const [sets, setSets] = useState<{ [exerciseId: string]: SetRequestDto[] }>(
    () => {
      const initial: { [exerciseId: string]: SetRequestDto[] } = {};
      (exercises || []).forEach((exercise) => {
        initial[exercise.id] = exercise.sets || [];
      });
      return initial;
    }
  );
  const [reorderMode, setReorderMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const fetchRoutine = async () => {
      if (id) {
        const data = await getRoutineById(id);
        const exercises: ExerciseRequestDto[] = Array.isArray(
          data.routineExercises
        )
          ? data.routineExercises.map((re: any) => ({
              ...re.exercise,
              sets: re.sets || [],
              notes: re.notes,
              restSeconds: re.restSeconds,
              weightUnit: re.weightUnit || re.exercise.weightUnit || "kg",
              repsType: re.repsType || re.exercise.repsType || "reps",
            }))
          : [];

        setEditTitle(data.title || "");
        setExercises(exercises);

        const initialSets: { [exerciseId: string]: SetRequestDto[] } = {};
        exercises.forEach((exercise) => {
          initialSets[exercise.id] = Array.isArray(exercise.sets)
            ? exercise.sets
            : [];
        });
        setSets(initialSets);
      }
    };
    fetchRoutine();
  }, [id]);

  useEffect(() => {
    setEditTitle(title);
    setExercises(
      (exercises || []).map((ex) => ({
        ...ex,
        weightUnit: ex.weightUnit || "kg",
        repsType: ex.repsType || "reps",
      }))
    );

    const initial: { [exerciseId: string]: SetRequestDto[] } = {};
    (exercises || []).forEach((exercise) => {
      initial[exercise.id] = exercise.sets || [];
    });
    setSets(initial);
  }, [title, exercises]);

  const handleUpdate = async () => {
    try {
      const routineToUpdate = {
        id: id,
        title: editTitle,
        exercises: exercisesState.map((exercise, index) => ({
          ...exercise,
          sets: sets[exercise.id] || [],
          weightUnit: exercise.weightUnit || "kg",
          repsType: exercise.repsType || "reps",
          order: index + 1,
        })),
      };

      const updatedRoutine = await updateRoutineById(
        routineToUpdate.id,
        routineToUpdate
      );

      alert("Rutina actualizada exitosamente");
      navigation.reset({
        index: 1,
        routes: [
          { name: "WorkoutList" },
          { name: "RoutineDetail", params: { routine: updatedRoutine } },
        ],
      });
    } catch (error) {
      console.error("Error al actualizar la rutina:", error);
      alert("Error al actualizar la rutina");
    }
  };

  const handleReorderComplete = (data: ExerciseRequestDto[]) => {
    setExercises(data);
  };

  const handleExerciseLongPress = (drag: () => void) => {
    console.log("🎯 Long press detected, activating reorder mode");
    setReorderMode(true);
    setTimeout(() => {
      drag();
    }, 100);
  };

  const renderExerciseCard = ({
    item,
    drag,
    isActive,
  }: RenderItemParams<ExerciseRequestDto>) => {
    if (reorderMode) {
      return (
        <ScaleDecorator>
          <TouchableOpacity
            onLongPress={drag}
            disabled={isActive}
            activeOpacity={1}
            style={[styles.reorderCard, isActive && styles.reorderCardActive]}
          >
            <View style={styles.reorderContent}>
              <View style={styles.dragHandle}>
                <Text style={styles.dragHandleIcon}>☰</Text>
              </View>
              <View style={styles.reorderInfo}>
                <Text style={styles.reorderName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.reorderSets}>
                  {sets[item.id]?.length || 0} series
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </ScaleDecorator>
      );
    }

    return (
      <ExerciseCard
        exercise={item}
        initialSets={sets[item.id] || []}
        onChangeSets={(updatedSets) =>
          setSets((prev) => ({ ...prev, [item.id]: updatedSets }))
        }
        onChangeExercise={(updatedExercise) => {
          setExercises((prev) =>
            prev.map((exercise) =>
              exercise.id === updatedExercise.id ? updatedExercise : exercise
            )
          );
        }}
        onLongPress={() => handleExerciseLongPress(drag)}
        isDragging={isActive}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <TextInput
            style={styles.titleInput}
            value={editTitle}
            onChangeText={setEditTitle}
            placeholder="Título de la rutina"
            editable={!reorderMode}
          />

          <View style={styles.headerRow}>
            <Text style={styles.subTitle}>Ejercicios asociados</Text>

            {reorderMode && (
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => setReorderMode(false)}
              >
                <Icon name="check" size={18} color="#fff" />
                <Text style={styles.doneButtonText}>Listo</Text>
              </TouchableOpacity>
            )}
          </View>

          {reorderMode && (
            <View style={styles.reorderHint}>
              <Text style={styles.reorderHintText}>
                Arrastra para reordenar los ejercicios
              </Text>
            </View>
          )}

          {!reorderMode && (
            <View style={styles.normalHint}>
              <Text style={styles.normalHintText}>
                Mantén presionado un ejercicio para reordenar
              </Text>
            </View>
          )}
        </View>

        {/* List Section - Ocupa el espacio disponible */}
        <View style={styles.listContainer}>
          <DraggableFlatList
            data={exercisesState}
            keyExtractor={(item) => item.id}
            renderItem={renderExerciseCard}
            onDragBegin={() => {
              console.log("🔄 Drag begin");
              setIsDragging(true);
            }}
            onDragEnd={({ data }) => {
              console.log("✅ Drag end");
              handleReorderComplete(data);
              setIsDragging(false);
            }}
            contentContainerStyle={styles.listContent}
            activationDistance={0}
            dragHitSlop={{ left: 20, right: 20, top: 15, bottom: 15 }}
            // 🔥 Añade estas props para mejor scroll
            showsVerticalScrollIndicator={true}
            ListFooterComponent={<View style={styles.listFooter} />}
          />
        </View>

        {/* Footer Section - Siempre visible */}
        <View style={styles.footerSection}>
          {!reorderMode && (
            <TouchableOpacity
              style={styles.addExerciseButton}
              onPress={() => {
                navigation.navigate("ExerciseList", {
                  routineId: id,
                  onFinishSelection: (
                    selectedExercises: ExerciseRequestDto[]
                  ) => {
                    setExercises((prev) => {
                      const newExercises = selectedExercises.filter(
                        (ex) => !prev.some((p) => p.id === ex.id)
                      );
                      return [...prev, ...newExercises];
                    });
                  },
                });
              }}
            >
              <Text style={styles.addExerciseButtonText}>
                + Añadir ejercicio
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.cancelButton,
                reorderMode && styles.buttonDisabled,
              ]}
              onPress={() => navigation.goBack()}
              disabled={reorderMode}
            >
              <Text
                style={[styles.cancelText, reorderMode && styles.textDisabled]}
              >
                Cancelar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.updateButton,
                reorderMode && styles.updateButtonDisabled,
              ]}
              onPress={handleUpdate}
              disabled={reorderMode}
            >
              <Text style={styles.updateButtonText}>Actualizar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  // 🔥 NUEVA SECCIÓN: Header fijo
  headerSection: {
    paddingTop: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  titleInput: {
    backgroundColor: "#f4f4f4",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: RFValue(16),
    color: "#333",
    marginBottom: 16,
    marginHorizontal: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginHorizontal: 16,
  },
  subTitle: {
    fontWeight: "bold",
    fontSize: RFValue(16),
    color: "#111827",
  },
  doneButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B981",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  doneButtonText: {
    fontSize: RFValue(14),
    fontWeight: "600",
    color: "#FFFFFF",
  },
  reorderHint: {
    backgroundColor: "#FEF3C7",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#F59E0B",
  },
  reorderHintText: {
    fontSize: RFValue(13),
    color: "#92400E",
    fontWeight: "500",
    textAlign: "center",
  },
  normalHint: {
    backgroundColor: "#EFF6FF",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#3B82F6",
  },
  normalHintText: {
    fontSize: RFValue(13),
    color: "#1E40AF",
    fontWeight: "500",
    textAlign: "center",
  },

  // 🔥 NUEVA SECCIÓN: Lista que ocupa el espacio disponible
  listContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 20, // Reducido porque ahora el footer está separado
    paddingHorizontal: 16,
  },
  listFooter: {
    height: 20, // Espacio extra al final de la lista
  },

  // 🔥 NUEVA SECCIÓN: Footer fijo en la parte inferior
  footerSection: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 20 : 12, // Safe area para iOS
  },
  addExerciseButton: {
    backgroundColor: "#e5e7eb",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 12,
  },
  addExerciseButtonText: {
    color: "#374151",
    fontWeight: "600",
    fontSize: RFValue(16),
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    flex: 1,
    marginRight: 12,
  },
  cancelText: {
    color: "#6b7280",
    fontWeight: "600",
    fontSize: RFValue(16),
  },
  updateButton: {
    backgroundColor: "#6C3BAA",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    flex: 1,
    marginLeft: 12,
  },
  updateButtonDisabled: {
    backgroundColor: "#d1d5db",
  },
  updateButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: RFValue(16),
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  textDisabled: {
    opacity: 0.4,
  },

  // Estilos para las cards de reordenamiento (mantén los que ya tienes)
  reorderCard: {
    backgroundColor: "#FFFFFF",
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reorderCardActive: {
    borderColor: "#6366F1",
    backgroundColor: "#EEF2FF",
    elevation: 8,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  reorderContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  dragHandle: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  dragHandleIcon: {
    fontSize: RFValue(18),
    color: "#6B7280",
  },
  reorderInfo: {
    flex: 1,
  },
  reorderName: {
    fontSize: RFValue(15),
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  reorderSets: {
    fontSize: RFValue(13),
    color: "#6B7280",
  },
});
