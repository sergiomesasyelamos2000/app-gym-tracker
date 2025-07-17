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
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { ExerciseRequestDto } from "../models/index.js";
import { WorkoutStackParamList } from "../screens/WorkoutStack";
import { fetchExercises } from "../services/exerciseService";

type ExerciseListRouteProp = RouteProp<WorkoutStackParamList, "ExerciseList">;

export default function ExerciseListScreen() {
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
    if (selectedExercises.some((item) => item.id === exercise.id)) {
      setSelectedExercises((prev) =>
        prev.filter((item) => item.id !== exercise.id)
      );
    } else {
      setSelectedExercises((prev) => [...prev, exercise]);
    }
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
            renderItem={({ item }) => {
              const isSelected = selectedExercises.some(
                (exercise) => exercise.id === item.id
              );

              return (
                <TouchableOpacity
                  style={[
                    styles.exerciseItem,
                    isSelected && styles.selectedItem,
                  ]}
                  onPress={() => handleSelectExercise(item)}
                >
                  <Image
                    source={
                      item.imageUrl
                        ? { uri: `data:image/png;base64,${item.imageUrl}` }
                        : require("../../assets/not-image.png")
                    }
                    style={styles.exerciseImage}
                  />
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseTitle}>{item.name}</Text>
                    <Text style={styles.exerciseMuscleGroup}>
                      Grupo muscular: {item.bodyParts.join(", ")}
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

          {/* Confirm Button */}
          {selectedExercises.length > 0 && (
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => {
                console.log("Ejercicios seleccionados:", selectedExercises);

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
    backgroundColor: "#f3e8ff",
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
