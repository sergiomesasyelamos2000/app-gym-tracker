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
  Animated,
} from "react-native";
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from "react-native-draggable-flatlist";
import { RFValue } from "react-native-responsive-fontsize";
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

  React.useEffect(() => {
    setEditTitle(title);
  }, [title]);

  const handleUpdate = async () => {
    try {
      const routineToUpdate = {
        id: id,
        title: editTitle,
        exercises: exercisesState.map((exercise) => ({
          ...exercise,
          sets: sets[exercise.id] || [],
          weightUnit: exercise.weightUnit || "kg",
          repsType: exercise.repsType || "reps",
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
        onLongPress={drag} // <-- PASAMOS drag aquí
        isDragging={isActive} // <-- PASAMOS isActive
        reorderMode={reorderMode} // <-- para control inmediato si quieres
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <TextInput
          style={styles.titleInput}
          value={editTitle}
          onChangeText={setEditTitle}
          placeholder="Título de la rutina"
          editable={!reorderMode}
        />

        <View style={styles.headerRow}>
          <Text style={styles.subTitle}>Ejercicios asociados:</Text>
          <TouchableOpacity
            style={[
              styles.reorderButton,
              reorderMode && styles.reorderButtonActive,
            ]}
            onPress={() => setReorderMode(!reorderMode)}
          >
            <Text
              style={[
                styles.reorderButtonText,
                reorderMode && styles.reorderButtonTextActive,
              ]}
            >
              {reorderMode ? "✓ Listo" : "⇅ Reordenar"}
            </Text>
          </TouchableOpacity>
        </View>

        {reorderMode && (
          <View style={styles.reorderHint}>
            <Text style={styles.reorderHintText}>
              Mantén pulsado y arrastra para reordenar
            </Text>
          </View>
        )}

        <DraggableFlatList
          data={exercisesState}
          keyExtractor={(item) => item.id}
          renderItem={renderExerciseCard}
          onDragEnd={({ data }) => handleReorderComplete(data)}
          contentContainerStyle={styles.listContent}
          activationDistance={reorderMode ? 0 : 999999}
        />

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
            <Text style={styles.addExerciseButtonText}>+ Añadir ejercicio</Text>
          </TouchableOpacity>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={reorderMode}
          >
            <Text
              style={[styles.cancelText, reorderMode && styles.buttonDisabled]}
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
    paddingTop: 12,
    backgroundColor: "#fff",
  },
  titleInput: {
    backgroundColor: "#f4f4f4",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: RFValue(16),
    color: "#333",
    marginBottom: 20,
    marginHorizontal: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    marginHorizontal: 16,
  },
  subTitle: {
    fontWeight: "bold",
    fontSize: RFValue(16),
  },
  reorderButton: {
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  reorderButtonActive: {
    backgroundColor: "#6366F1",
  },
  reorderButtonText: {
    fontSize: RFValue(13),
    fontWeight: "600",
    color: "#4B5563",
  },
  reorderButtonTextActive: {
    color: "#FFFFFF",
  },
  reorderHint: {
    backgroundColor: "#FEF3C7",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#F59E0B",
  },
  reorderHintText: {
    fontSize: RFValue(13),
    color: "#92400E",
    fontWeight: "500",
  },
  listContent: {
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  reorderCard: {
    backgroundColor: "#FFFFFF",
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  reorderCardActive: {
    borderColor: "#6366F1",
    backgroundColor: "#EEF2FF",
    elevation: 8,
    shadowColor: "#6366F1",
    shadowOffset: {
      width: 0,
      height: 4,
    },
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
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: "transparent",
    paddingVertical: 0,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    margin: 0,
    alignItems: "center",
  },
  cancelText: {
    color: "#888",
    fontWeight: "bold",
    fontSize: RFValue(16),
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  updateButton: {
    backgroundColor: "#6C3BAA",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    margin: 0,
  },
  updateButtonDisabled: {
    backgroundColor: "#D1D5DB",
  },
  updateButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: RFValue(16),
  },
  addExerciseButton: {
    backgroundColor: "#e0e0e0",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
  },
  addExerciseButtonText: {
    color: "#333",
    fontWeight: "bold",
    fontSize: RFValue(16),
  },
});
