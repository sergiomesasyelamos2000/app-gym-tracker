import {
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { WorkoutStackParamList } from "../../../screens/WorkoutStack";
import { fetchExercises } from "../../../services/exerciseService";
import ExerciseItem from "../components/ExerciseItem";
import { ExerciseRequestDto } from "../../../models";

type ExerciseListRouteProp = RouteProp<WorkoutStackParamList, "ExerciseList">;

export default function ExerciseList() {
  const route = useRoute<ExerciseListRouteProp>();
  const navigation = useNavigation<NavigationProp<WorkoutStackParamList>>();
  const { onFinishSelection } = route.params || {};

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExercises, setSelectedExercises] = useState<
    ExerciseRequestDto[]
  >([]);
  const [exercises, setExercises] = useState<ExerciseRequestDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadExercises = async () => {
      try {
        const data = await fetchExercises();
        setExercises(data);
      } catch (error) {
        console.error("Error fetching exercises:", error);
      } finally {
        setLoading(false);
      }
    };
    loadExercises();
  }, []);

  const filteredExercises = exercises.filter((exercise) =>
    exercise.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectExercise = (exercise: ExerciseRequestDto) => {
    setSelectedExercises((prev) =>
      prev.some((item) => item.id === exercise.id)
        ? prev.filter((item) => item.id !== exercise.id)
        : [...prev, exercise]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C3BAA" />
        </View>
      ) : (
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
            renderItem={({ item }) => (
              <ExerciseItem
                item={item}
                isSelected={selectedExercises.some((ex) => ex.id === item.id)}
                onSelect={handleSelectExercise}
                onRedirect={() =>
                  console.log("Redirigir a otra pantalla con:", item.name)
                }
              />
            )}
          />

          {/* Confirm Button */}
          {selectedExercises.length > 0 && (
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => {
                console.log("Ejercicios seleccionados:", selectedExercises);
                onFinishSelection?.(selectedExercises);
                navigation.navigate("RoutineDetail", {
                  exercises: selectedExercises,
                });
              }}
            >
              <Text style={styles.confirmButtonText}>
                Has seleccionado {selectedExercises.length} ejercicio(s)
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  confirmButton: {
    backgroundColor: "#6C3BAA",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
