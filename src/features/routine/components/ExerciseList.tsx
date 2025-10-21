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
import { RFValue } from "react-native-responsive-fontsize";
import { ExerciseRequestDto } from "../../../models";
import { fetchExercises } from "../../../services/exerciseService";
import ExerciseItem from "../components/ExerciseItem";
import { WorkoutStackParamList } from "../screens/WorkoutStack";

type ExerciseListRouteProp = RouteProp<WorkoutStackParamList, "ExerciseList">;

export default function ExerciseList() {
  const route = useRoute<ExerciseListRouteProp>();
  const navigation = useNavigation<NavigationProp<WorkoutStackParamList>>();

  const {
    onFinishSelection,
    routineId,
    singleSelection = false,
  } = route.params || {};

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExercises, setSelectedExercises] = useState<
    ExerciseRequestDto[]
  >([]);
  const [exercises, setExercises] = useState<ExerciseRequestDto[]>([]);
  const [loading, setLoading] = useState(true);

  const handleExerciseCreated = (newExercise: ExerciseRequestDto) => {
    // Agrega el nuevo ejercicio a la lista de seleccionados automáticamente
    setSelectedExercises((prev) => [...prev, newExercise]);
  };

  const navigateToCreateExercise = () => {
    navigation.navigate("CreateExercise", {
      onExerciseCreated: handleExerciseCreated,
    });
  };

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadExercises = async () => {
      try {
        setError(null);
        const data = await fetchExercises();
        setExercises(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
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
    if (singleSelection) {
      setSelectedExercises([exercise]);
    } else {
      setSelectedExercises((prev) =>
        prev.some((item) => item.id === exercise.id)
          ? prev.filter((item) => item.id !== exercise.id)
          : [...prev, exercise]
      );
    }
  };

  const handleConfirm = () => {
    if (!onFinishSelection) return;

    onFinishSelection(selectedExercises);

    if (routineId) {
      // Editando rutina existente: solo regresamos a la pantalla anterior
      navigation.goBack();
    } else {
      // Creando nueva rutina: vamos a la pantalla de detalle con los ejercicios seleccionados
      navigation.navigate("RoutineDetail", { exercises: selectedExercises });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C3BAA" />
          <Text style={styles.loadingText}>Cargando ejercicios...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              /* Recargar los ejercicios */
            }}
          >
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Tu contenido actual aquí
        <View style={styles.container}>
          {/* Header con buscador */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Listado de Ejercicios</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar ejercicio..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
          </View>

          {/* Lista de ejercicios */}
          <FlatList
            data={filteredExercises}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ExerciseItem
                item={item}
                isSelected={selectedExercises.some((ex) => ex.id === item.id)}
                onSelect={handleSelectExercise}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchQuery
                    ? "No se encontraron ejercicios"
                    : "No hay ejercicios disponibles"}
                </Text>

                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    style={styles.createButton}
                    onPress={navigateToCreateExercise}
                  >
                    <Text style={styles.createButtonText}>
                      Crear ejercicio personalizado
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            }
          />

          {/* Botón de confirmación */}
          {selectedExercises.length > 0 && (
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirm}
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
    fontSize: RFValue(24),
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
    fontSize: RFValue(16),
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
    fontSize: RFValue(18),
    fontWeight: "bold",
  },
  loadingText: {
    marginTop: 12,
    fontSize: RFValue(16),
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: RFValue(16),
    color: "#d32f2f",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#6C3BAA",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: RFValue(16),
  },
  emptyText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: RFValue(16),
    color: "#666",
  },
  emptyContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  createButton: {
    marginTop: 16,
    backgroundColor: "#6C3BAA",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: "#fff",
    fontSize: RFValue(16),
    fontWeight: "bold",
  },
});
