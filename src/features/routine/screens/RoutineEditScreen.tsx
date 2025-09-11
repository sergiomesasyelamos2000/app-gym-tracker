import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ExerciseRequestDto, SetRequestDto } from "../../../models";
import { WorkoutStackParamList } from "./WorkoutStack";
import { getRoutineById, updateRoutineById } from "../services/routineService";
import ExerciseCard from "../components/ExerciseCard/ExerciseCard";

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
  useEffect(() => {
    const fetchRoutine = async () => {
      if (id) {
        const data = await getRoutineById(id);
        console.log("Fetched routine data:", data);

        // Mapea los ejercicios desde routineExercises
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

        // Inicializa los sets para cada ejercicio
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
      // Construye el objeto rutina para actualizar
      const routineToUpdate = {
        id: id, // Usa el id existente
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
        index: 1, // La pantalla activa será RoutineDetail
        routes: [
          { name: "WorkoutList" }, // Siempre en la base
          { name: "RoutineDetail", params: { routine: updatedRoutine } }, // Arriba
        ],
      });
    } catch (error) {
      console.error("Error al actualizar la rutina:", error);
      alert("Error al actualizar la rutina");
    }
  };

  const renderExerciseCard = ({ item }: { item: ExerciseRequestDto }) => (
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
    />
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <TextInput
          style={styles.titleInput}
          value={editTitle}
          onChangeText={setEditTitle}
          placeholder="Título de la rutina"
        />
        <Text style={styles.subTitle}>Ejercicios asociados:</Text>
        <FlatList
          data={exercisesState} // <-- usa el estado correcto
          keyExtractor={(item) => item.id}
          renderItem={renderExerciseCard}
          contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 16 }}
        />
        <TouchableOpacity
          style={styles.addExerciseButton}
          onPress={() => {
            navigation.navigate("ExerciseList", {
              routineId: id, // <--- pasamos el id de la rutina
              onFinishSelection: (selectedExercises: ExerciseRequestDto[]) => {
                // Actualizamos los ejercicios en la edición
                setExercises((prev) => {
                  // Evitamos duplicados
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

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.updateButton} onPress={handleUpdate}>
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
    fontSize: 16,
    color: "#333",
    marginBottom: 20,
    marginHorizontal: 16,
  },
  subTitle: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center", // Centra verticalmente
    marginTop: 16, // Menos espacio arriba
    marginHorizontal: 16,
    marginBottom: 8, // Menos espacio abajo
    backgroundColor: "transparent", // Sin fondo
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
    fontSize: 16,
  },
  updateButton: {
    backgroundColor: "#6C3BAA",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    margin: 0,
  },
  updateButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
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
    fontSize: 16,
  },
});
