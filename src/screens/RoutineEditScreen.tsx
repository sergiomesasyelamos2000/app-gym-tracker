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
import ExerciseCard, { SetData } from "../components/ExerciseCard";
import { ExerciseRequestDto } from "../models";
import { WorkoutStackParamList } from "./WorkoutStack";
import { updateRoutineById } from "../services/routineService";

export default function RoutineEditScreen() {
  const route = useRoute();
  const navigation =
    useNavigation<NativeStackNavigationProp<WorkoutStackParamList>>();
  const { id, title, exercises, onUpdate } =
    route.params as WorkoutStackParamList["RoutineEdit"];
  const [editTitle, setEditTitle] = React.useState(title);
  const [exercisesState, setExercises] =
    useState<ExerciseRequestDto[]>(exercises);
  const [sets, setSets] = useState<{ [exerciseId: string]: SetData[] }>(() => {
    const initial: { [exerciseId: string]: SetData[] } = {};
    (exercises || []).forEach((exercise) => {
      initial[exercise.id] = exercise.sets || [];
    });
    return initial;
  });

  useEffect(() => {
    setEditTitle(title);
    setExercises(exercises);
    const initial: { [exerciseId: string]: SetData[] } = {};
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
        totalTime: 0, // Puedes ajustar estos valores si tienes datos
        totalWeight: 0,
        completedSets: 0,
        exercises: exercisesState.map((exercise) => ({
          ...exercise,
          sets: sets[exercise.id] || [],
        })),
      };

      await updateRoutineById(routineToUpdate.id, routineToUpdate);

      alert("Rutina actualizada exitosamente");
      navigation.goBack();
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
          data={exercises}
          keyExtractor={(item) => item.id}
          renderItem={renderExerciseCard}
          contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 16 }}
        />
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
});
