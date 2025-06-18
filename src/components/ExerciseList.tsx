import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import CustomToast from "../ui/CustomToast"; // Asegúrate de importar tu CustomToast

const exercises = [
  {
    id: "1",
    title: "Bench Press",
    muscleGroup: "Chest",
    image: "https://s3assets.skimble.com/assets/2289478/image_iphone.jpg",
  },
  {
    id: "2",
    title: "Squats",
    muscleGroup: "Legs",
    image: "https://via.placeholder.com/80",
  },
  {
    id: "3",
    title: "Deadlift",
    muscleGroup: "Back",
    image: "https://via.placeholder.com/80",
  },
  {
    id: "4",
    title: "Bicep Curl",
    muscleGroup: "Arms",
    image: "https://via.placeholder.com/80",
  },
];

type Exercise = {
  id: string;
  title: string;
  muscleGroup: string;
  image: string;
};

export default function ExerciseListScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);

  const filteredExercises = exercises.filter((exercise) =>
    exercise.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectExercise = (exercise: Exercise) => {
    if (selectedExercises.some((item) => item.id === exercise.id)) {
      // Si ya está seleccionado, lo eliminamos del array
      setSelectedExercises((prev) =>
        prev.filter((item) => item.id !== exercise.id)
      );
    } else {
      // Si no está seleccionado, lo agregamos al array
      setSelectedExercises((prev) => [...prev, exercise]);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Listado de Ejercicios</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar ejercicio..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Exercise List */}
        <FlatList
          data={filteredExercises}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isSelected = selectedExercises.some(
              (exercise) => exercise.id === item.id
            );

            return (
              <TouchableOpacity
                style={[
                  styles.exerciseItem,
                  isSelected && styles.selectedItem, // Cambia el estilo si está seleccionado
                ]}
                onPress={() => handleSelectExercise(item)}
              >
                <Image
                  source={{ uri: item.image }}
                  style={styles.exerciseImage}
                />
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseTitle}>{item.title}</Text>
                  <Text style={styles.exerciseMuscleGroup}>
                    {item.muscleGroup}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.redirectButton}
                  onPress={() => console.log("Redirigir a otra pantalla")}
                >
                  <Icon name="arrow-forward" size={24} color="#6C3BAA" />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
        />

        {/* Toast */}
        {selectedExercises.length > 0 && (
          <CustomToast
            text1={`Has seleccionado ${selectedExercises.length} ejercicio(s)`}
            progress={-1}
            onCancel={() => setSelectedExercises([])} // Limpia la selección
          />
        )}
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
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  searchInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    elevation: 2,
    fontSize: 16,
  },
  exerciseItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
  },
  selectedItem: {
    backgroundColor: "#f3e8ff", // Fondo verde claro para elementos seleccionados
    borderColor: "#6C3BAA",
    borderWidth: 2,
  },
  exerciseImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  exerciseMuscleGroup: {
    fontSize: 14,
    color: "#777",
    marginTop: 4,
  },
  redirectButton: {
    padding: 8,
  },
});
