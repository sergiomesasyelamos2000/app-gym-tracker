import {
  NavigationProp,
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import type {
  EquipmentDto,
  ExerciseRequestDto,
  MuscleDto,
} from "@sergiomesasyelamos2000/shared";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import {
  fetchEquipment,
  fetchMuscles,
  fetchExercises,
  isUsingCache,
  searchExercises,
} from "../../../services/exerciseService";
import ExerciseItem from "../components/ExerciseItem";
import { WorkoutStackParamList } from "../screens/WorkoutStack";
import { useExerciseSelectionStore } from "../../../store/useExerciseSelectionStore";
import {
  normalizeExerciseImage,
  normalizeExercisesImage,
} from "../utils/normalizeExerciseImage";

type ExerciseListRouteProp = RouteProp<WorkoutStackParamList, "ExerciseList">;

type ExerciseListItem = ExerciseRequestDto & {
  equipments?: string[];
  targetMuscles?: string[];
  secondaryMuscles?: string[];
  bodyParts?: string[];
};

export default function ExerciseList() {
  const { theme } = useTheme();
  const route = useRoute<ExerciseListRouteProp>();
  const navigation = useNavigation<NavigationProp<WorkoutStackParamList>>();

  const {
    routineId,
    mode = "createRoutine",
    replaceExerciseId,
    singleSelection = false,
  } = route.params || {};

  const [searchQuery, setSearchQuery] = useState("");
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState("");
  const [selectedMuscleId, setSelectedMuscleId] = useState("");
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [tempEquipmentId, setTempEquipmentId] = useState("");
  const [tempMuscleId, setTempMuscleId] = useState("");
  const [equipmentOptions, setEquipmentOptions] = useState<EquipmentDto[]>([]);
  const [muscleOptions, setMuscleOptions] = useState<MuscleDto[]>([]);

  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const [selectedExercises, setSelectedExercises] = useState<
    ExerciseRequestDto[]
  >([]);
  const [exercises, setExercises] = useState<ExerciseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const consumePendingCreatedExercise = useExerciseSelectionStore(
    (state) => state.consumePendingCreatedExercise
  );
  const setSelectionContext = useExerciseSelectionStore(
    (state) => state.setSelectionContext
  );
  const clearSelectionContext = useExerciseSelectionStore(
    (state) => state.clearSelectionContext
  );

  const selectedEquipmentName = useMemo(
    () => equipmentOptions.find((item) => item.id === selectedEquipmentId)?.name,
    [equipmentOptions, selectedEquipmentId]
  );
  const selectedMuscleName = useMemo(
    () => muscleOptions.find((item) => item.id === selectedMuscleId)?.name,
    [muscleOptions, selectedMuscleId]
  );

  const hasActiveFilters = Boolean(
    searchQuery.trim() || selectedEquipmentId || selectedMuscleId
  );
  const hasSelectionFilters = Boolean(selectedEquipmentId || selectedMuscleId);
  const selectionFiltersCount =
    Number(Boolean(selectedEquipmentId)) + Number(Boolean(selectedMuscleId));

  const navigateToCreateExercise = () => {
    setSelectionContext({
      mode,
      routineId,
      replaceExerciseId,
      singleSelection,
    });
    navigation.navigate("CreateExercise");
  };

  const loadFilterOptions = useCallback(async () => {
    try {
      const [equipmentData, muscleData] = await Promise.all([
        fetchEquipment(),
        fetchMuscles(),
      ]);
      setEquipmentOptions(equipmentData);
      setMuscleOptions(muscleData);
    } catch {
      // Los filtros quedan opcionales si no cargan
    }
  }, []);

  const loadExercises = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setIsOfflineMode(false);

      const name = searchQuery.trim();
      const equipment = selectedEquipmentName || "";
      const muscle = selectedMuscleName || "";

      const data = hasActiveFilters
        ? await searchExercises({ name, equipment, muscle })
        : await fetchExercises();

      setExercises(normalizeExercisesImage(data as ExerciseListItem[]));

      const fromCache = await isUsingCache();
      setIsOfflineMode(fromCache);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error desconocido";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [hasActiveFilters, searchQuery, selectedEquipmentName, selectedMuscleName]);

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadExercises();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [loadExercises]);

  useFocusEffect(
    useCallback(() => {
      const createdExercise = consumePendingCreatedExercise();
      if (!createdExercise) return;

      const normalizedCreatedExercise = normalizeExerciseImage(createdExercise);

      setExercises((prev) =>
        prev.some((item) => item.id === createdExercise.id)
          ? prev
          : [normalizedCreatedExercise as ExerciseListItem, ...prev]
      );

      setSelectedExercises((prev) =>
        prev.some((item) => item.id === createdExercise.id)
          ? prev
          : [...prev, normalizedCreatedExercise]
      );
    }, [consumePendingCreatedExercise])
  );

  const handleSelectExercise = (exercise: ExerciseRequestDto) => {
    const normalizedExercise = normalizeExerciseImage(exercise);

    if (singleSelection) {
      setSelectedExercises([normalizedExercise]);
    } else {
      setSelectedExercises((prev) =>
        prev.some((item) => item.id === normalizedExercise.id)
          ? prev.filter((item) => item.id !== normalizedExercise.id)
          : [...prev, normalizedExercise]
      );
    }
  };

  const handleConfirm = () => {
    if (selectedExercises.length === 0) return;

    if (mode === "replaceExercise" && routineId && replaceExerciseId) {
      navigation.navigate("RoutineEdit", {
        id: routineId,
        replaceExerciseId,
        replacementExercise: selectedExercises[0],
      });
      clearSelectionContext();
      return;
    }

    if (mode === "addToRoutine" && routineId) {
      navigation.navigate("RoutineEdit", {
        id: routineId,
        addExercises: selectedExercises,
      });
      clearSelectionContext();
      return;
    }

    navigation.navigate("RoutineDetail", {
      exercises: selectedExercises,
      start: false,
    });
    clearSelectionContext();
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedEquipmentId("");
    setSelectedMuscleId("");
  };

  const openFiltersModal = () => {
    setTempEquipmentId(selectedEquipmentId);
    setTempMuscleId(selectedMuscleId);
    setShowFiltersModal(true);
  };

  const closeFiltersModal = () => {
    setShowFiltersModal(false);
  };

  const applyFiltersModal = () => {
    setSelectedEquipmentId(tempEquipmentId);
    setSelectedMuscleId(tempMuscleId);
    setShowFiltersModal(false);
  };

  const clearSelectionFilters = () => {
    setSelectedEquipmentId("");
    setSelectedMuscleId("");
  };

  const clearModalSelectionFilters = () => {
    setTempEquipmentId("");
    setTempMuscleId("");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Cargando ejercicios...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadExercises}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.container}>
          {isOfflineMode && exercises.length > 0 && (
            <View style={styles.offlineBanner}>
              <Text style={styles.offlineBannerText}>
                Modo sin conexion - Mostrando ejercicios guardados
              </Text>
            </View>
          )}

          <View style={styles.header}>
            <Text style={styles.headerTitle}>Listado de Ejercicios</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar ejercicio..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={theme.textTertiary}
            />
          </View>

          <View style={styles.filterActionsRow}>
            <TouchableOpacity style={styles.openFiltersButton} onPress={openFiltersModal}>
              <Text style={styles.openFiltersText}>
                Filtros
                {selectionFiltersCount > 0 ? ` (${selectionFiltersCount})` : ""}
              </Text>
            </TouchableOpacity>
            {hasActiveFilters && (
              <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
                <Text style={styles.clearFiltersText}>Limpiar todo</Text>
              </TouchableOpacity>
            )}
          </View>

          {hasSelectionFilters && (
            <View style={styles.activeFiltersRow}>
              {selectedEquipmentName && (
                <View style={styles.activeFilterPill}>
                  <Text style={styles.activeFilterPillText}>
                    Equipo: {selectedEquipmentName}
                  </Text>
                </View>
              )}
              {selectedMuscleName && (
                <View style={styles.activeFilterPill}>
                  <Text style={styles.activeFilterPillText}>
                    Musculo: {selectedMuscleName}
                  </Text>
                </View>
              )}
              <TouchableOpacity onPress={clearSelectionFilters}>
                <Text style={styles.clearSelectionText}>Quitar</Text>
              </TouchableOpacity>
            </View>
          )}

          <Modal
            visible={showFiltersModal}
            transparent
            animationType="slide"
            onRequestClose={closeFiltersModal}
          >
            <View style={styles.modalOverlay}>
              <TouchableOpacity
                style={styles.modalBackdrop}
                activeOpacity={1}
                onPress={closeFiltersModal}
              />
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Filtrar ejercicios</Text>

                <Text style={styles.modalSectionTitle}>Equipamiento</Text>
                <ScrollView
                  style={styles.modalSectionScroll}
                  contentContainerStyle={styles.modalChipsWrap}
                  showsVerticalScrollIndicator={false}
                >
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      !tempEquipmentId && styles.filterChipActive,
                    ]}
                    onPress={() => setTempEquipmentId("")}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        !tempEquipmentId && styles.filterChipTextActive,
                      ]}
                    >
                      Todos
                    </Text>
                  </TouchableOpacity>
                  {equipmentOptions.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.filterChip,
                        tempEquipmentId === item.id && styles.filterChipActive,
                      ]}
                      onPress={() => setTempEquipmentId(item.id)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          tempEquipmentId === item.id && styles.filterChipTextActive,
                        ]}
                      >
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.modalSectionTitle}>Musculo</Text>
                <ScrollView
                  style={styles.modalSectionScroll}
                  contentContainerStyle={styles.modalChipsWrap}
                  showsVerticalScrollIndicator={false}
                >
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      !tempMuscleId && styles.filterChipActive,
                    ]}
                    onPress={() => setTempMuscleId("")}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        !tempMuscleId && styles.filterChipTextActive,
                      ]}
                    >
                      Todos
                    </Text>
                  </TouchableOpacity>
                  {muscleOptions.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.filterChip,
                        tempMuscleId === item.id && styles.filterChipActive,
                      ]}
                      onPress={() => setTempMuscleId(item.id)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          tempMuscleId === item.id && styles.filterChipTextActive,
                        ]}
                      >
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={styles.modalButtonsRow}>
                  <TouchableOpacity
                    style={styles.modalSecondaryButton}
                    onPress={clearModalSelectionFilters}
                  >
                    <Text style={styles.modalSecondaryButtonText}>Limpiar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalSecondaryButton}
                    onPress={closeFiltersModal}
                  >
                    <Text style={styles.modalSecondaryButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalPrimaryButton}
                    onPress={applyFiltersModal}
                  >
                    <Text style={styles.modalPrimaryButtonText}>Aplicar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          <View style={styles.listContainer}>
            <FlatList
              data={exercises}
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
                    {hasActiveFilters
                      ? "No hay ejercicios que coincidan con los filtros"
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
          </View>

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

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
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
      marginBottom: 12,
    },
    headerTitle: {
      fontSize: RFValue(24),
      fontWeight: "bold",
      color: theme.text,
      marginBottom: 8,
    },
    searchInput: {
      backgroundColor: theme.card,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      elevation: 2,
      fontSize: RFValue(16),
      color: theme.text,
      borderWidth: 1,
      borderColor: theme.border,
    },
    filterActionsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    openFiltersButton: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
    },
    openFiltersText: {
      color: theme.text,
      fontSize: RFValue(14),
      fontWeight: "600",
    },
    activeFiltersRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 8,
      marginBottom: 12,
    },
    activeFilterPill: {
      backgroundColor: `${theme.primary}18`,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    activeFilterPillText: {
      color: theme.primary,
      fontWeight: "600",
      fontSize: RFValue(12),
    },
    clearSelectionText: {
      color: theme.textSecondary,
      fontSize: RFValue(12),
      fontWeight: "600",
    },
    filterChip: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    filterChipActive: {
      borderColor: theme.primary,
      backgroundColor: `${theme.primary}20`,
    },
    filterChipText: {
      color: theme.textSecondary,
      fontSize: RFValue(13),
      fontWeight: "500",
    },
    filterChipTextActive: {
      color: theme.primary,
      fontWeight: "700",
    },
    clearFiltersButton: {
      alignSelf: "flex-start",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
    },
    clearFiltersText: {
      color: theme.textSecondary,
      fontSize: RFValue(13),
      fontWeight: "600",
    },
    listContainer: {
      flex: 1,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: "flex-end",
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0, 0, 0, 0.35)",
    },
    modalContent: {
      maxHeight: "78%",
      backgroundColor: theme.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 20,
      borderWidth: 1,
      borderColor: theme.border,
    },
    modalTitle: {
      color: theme.text,
      fontSize: RFValue(18),
      fontWeight: "700",
      marginBottom: 12,
    },
    modalSectionTitle: {
      color: theme.textSecondary,
      fontSize: RFValue(13),
      fontWeight: "700",
      marginBottom: 8,
      marginTop: 6,
    },
    modalSectionScroll: {
      maxHeight: 120,
      marginBottom: 4,
    },
    modalChipsWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      paddingBottom: 8,
    },
    modalButtonsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 8,
      marginTop: 12,
    },
    modalSecondaryButton: {
      flex: 1,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
      paddingVertical: 11,
      alignItems: "center",
    },
    modalSecondaryButtonText: {
      color: theme.textSecondary,
      fontSize: RFValue(13),
      fontWeight: "600",
    },
    modalPrimaryButton: {
      flex: 1,
      borderRadius: 10,
      backgroundColor: theme.primary,
      paddingVertical: 11,
      alignItems: "center",
    },
    modalPrimaryButtonText: {
      color: "#fff",
      fontSize: RFValue(13),
      fontWeight: "700",
    },
    confirmButton: {
      backgroundColor: theme.primary,
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
      color: theme.textSecondary,
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    errorText: {
      fontSize: RFValue(16),
      color: theme.error,
      textAlign: "center",
      marginBottom: 16,
    },
    retryButton: {
      backgroundColor: theme.primary,
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
      color: theme.textSecondary,
    },
    emptyContainer: {
      marginTop: 20,
      alignItems: "center",
    },
    createButton: {
      marginTop: 16,
      backgroundColor: theme.primary,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 8,
    },
    createButtonText: {
      color: "#fff",
      fontSize: RFValue(16),
      fontWeight: "bold",
    },
    offlineBanner: {
      backgroundColor: "#FFA500",
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      marginBottom: 12,
    },
    offlineBannerText: {
      color: "#fff",
      fontSize: RFValue(14),
      fontWeight: "600",
      textAlign: "center",
    },
  });
