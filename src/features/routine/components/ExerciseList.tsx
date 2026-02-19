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

const SEARCH_STOP_WORDS = new Set([
  "de",
  "del",
  "la",
  "el",
  "los",
  "las",
  "con",
  "y",
  "en",
  "para",
  "a",
  "al",
]);

const normalizeSearchText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenizeSearch = (value: string) =>
  normalizeSearchText(value)
    .split(" ")
    .filter((token) => token.length > 0 && !SEARCH_STOP_WORDS.has(token));

const matchesToken = (value: string, expected: string) => {
  const normalizedValue = normalizeSearchText(value);
  const normalizedExpected = normalizeSearchText(expected);
  return (
    normalizedValue === normalizedExpected ||
    normalizedValue.startsWith(`${normalizedExpected} `)
  );
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
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>(
    []
  );
  const [selectedMuscleIds, setSelectedMuscleIds] = useState<string[]>([]);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [tempEquipmentIds, setTempEquipmentIds] = useState<string[]>([]);
  const [tempMuscleIds, setTempMuscleIds] = useState<string[]>([]);
  const [equipmentOptions, setEquipmentOptions] = useState<EquipmentDto[]>([]);
  const [muscleOptions, setMuscleOptions] = useState<MuscleDto[]>([]);

  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const [selectedExercises, setSelectedExercises] = useState<
    ExerciseRequestDto[]
  >([]);
  const [allExercises, setAllExercises] = useState<ExerciseListItem[]>([]);
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

  const selectedEquipmentNames = useMemo(
    () =>
      equipmentOptions
        .filter((item) => selectedEquipmentIds.includes(item.id))
        .map((item) => item.name),
    [equipmentOptions, selectedEquipmentIds]
  );
  const selectedMuscleNames = useMemo(
    () =>
      muscleOptions
        .filter((item) => selectedMuscleIds.includes(item.id))
        .map((item) => item.name),
    [muscleOptions, selectedMuscleIds]
  );
  const selectedEquipmentLabel = useMemo(
    () => selectedEquipmentNames.join(", "),
    [selectedEquipmentNames]
  );
  const selectedMuscleLabel = useMemo(
    () => selectedMuscleNames.join(", "),
    [selectedMuscleNames]
  );

  const normalizedQuery = normalizeSearchText(searchQuery);
  const queryTokens = useMemo(() => tokenizeSearch(searchQuery), [searchQuery]);
  const hasActiveFilters = Boolean(
    normalizedQuery || selectedEquipmentIds.length || selectedMuscleIds.length
  );
  const hasSelectionFilters = Boolean(
    selectedEquipmentIds.length || selectedMuscleIds.length
  );
  const selectionFiltersCount =
    selectedEquipmentIds.length + selectedMuscleIds.length;

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
      const data = await fetchExercises();
      setAllExercises(normalizeExercisesImage(data as ExerciseListItem[]));

      const fromCache = await isUsingCache();
      setIsOfflineMode(fromCache);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error desconocido";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  useFocusEffect(
    useCallback(() => {
      const createdExercise = consumePendingCreatedExercise();
      if (!createdExercise) return;

      const normalizedCreatedExercise = normalizeExerciseImage(createdExercise);

      setAllExercises((prev) =>
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

  const filteredExercises = useMemo(() => {
    if (!allExercises.length) return [];

    const scored = allExercises
      .map((exercise) => {
        const normalizedName = normalizeSearchText(exercise.name);
        const nameTokens = tokenizeSearch(exercise.name);

        let nameScore = 0;
        if (!normalizedQuery) {
          nameScore = 1;
        } else if (normalizedName.includes(normalizedQuery)) {
          nameScore = 100;
        } else if (queryTokens.length > 0) {
          const tokenScore = queryTokens.reduce((total, queryToken) => {
            const bestTokenMatch = nameTokens.reduce((best, token) => {
              if (token === queryToken) return Math.max(best, 25);
              if (token.startsWith(queryToken)) return Math.max(best, 18);
              if (token.includes(queryToken) || queryToken.includes(token)) {
                return Math.max(best, 12);
              }
              return best;
            }, 0);
            return total + bestTokenMatch;
          }, 0);

          const matchedTokenCount = queryTokens.filter((queryToken) =>
            nameTokens.some(
              (token) =>
                token === queryToken ||
                token.startsWith(queryToken) ||
                token.includes(queryToken) ||
                queryToken.includes(token)
            )
          ).length;

          if (matchedTokenCount > 0) {
            nameScore = tokenScore + matchedTokenCount * 10;
          }
        }

        return { exercise, nameScore };
      })
      .filter(({ nameScore }) => nameScore > 0);

    return scored
      .map(({ exercise, nameScore }) => {
        const matchesName = nameScore > 0;

        const matchesEquipment =
          selectedEquipmentNames.length === 0 ||
          (exercise.equipments || []).some((value) => {
            return selectedEquipmentNames.some((selectedEquipmentName) => {
              return matchesToken(value, selectedEquipmentName);
            });
          });

        const matchesMuscle =
          selectedMuscleNames.length === 0 ||
          selectedMuscleNames.every((selectedMuscleName) =>
            [...(exercise.targetMuscles || []), ...(exercise.bodyParts || [])].some(
              (value) => matchesToken(value, selectedMuscleName)
            )
          );

        return {
          exercise,
          nameScore,
          visible: matchesName && matchesEquipment && matchesMuscle,
        };
      })
      .filter((item) => item.visible)
      .sort((a, b) => b.nameScore - a.nameScore)
      .map((item) => item.exercise);
  }, [
    allExercises,
    normalizedQuery,
    queryTokens,
    selectedEquipmentNames,
    selectedMuscleNames,
  ]);

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
    setSelectedEquipmentIds([]);
    setSelectedMuscleIds([]);
  };

  const openFiltersModal = () => {
    setTempEquipmentIds(selectedEquipmentIds);
    setTempMuscleIds(selectedMuscleIds);
    setShowFiltersModal(true);
  };

  const closeFiltersModal = () => {
    setShowFiltersModal(false);
  };

  const applyFiltersModal = () => {
    setSelectedEquipmentIds(tempEquipmentIds);
    setSelectedMuscleIds(tempMuscleIds);
    setShowFiltersModal(false);
  };

  const clearSelectionFilters = () => {
    setSelectedEquipmentIds([]);
    setSelectedMuscleIds([]);
  };

  const clearModalSelectionFilters = () => {
    setTempEquipmentIds([]);
    setTempMuscleIds([]);
  };

  const toggleTempEquipment = (id: string) => {
    setTempEquipmentIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const toggleTempMuscle = (id: string) => {
    setTempMuscleIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
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
          {isOfflineMode && filteredExercises.length > 0 && (
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
              {selectedEquipmentLabel.length > 0 && (
                <View style={styles.activeFilterPill}>
                  <Text style={styles.activeFilterPillText}>
                    Equipo: {selectedEquipmentLabel}
                  </Text>
                </View>
              )}
              {selectedMuscleLabel.length > 0 && (
                <View style={styles.activeFilterPill}>
                  <Text style={styles.activeFilterPillText}>
                    Musculo: {selectedMuscleLabel}
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
                      tempEquipmentIds.length === 0 && styles.filterChipActive,
                    ]}
                    activeOpacity={1}
                    onPress={() => setTempEquipmentIds([])}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        tempEquipmentIds.length === 0 && styles.filterChipTextActive,
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
                        tempEquipmentIds.includes(item.id) &&
                          styles.filterChipActive,
                      ]}
                      activeOpacity={1}
                      onPress={() => toggleTempEquipment(item.id)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          tempEquipmentIds.includes(item.id) &&
                            styles.filterChipTextActive,
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
                      tempMuscleIds.length === 0 && styles.filterChipActive,
                    ]}
                    activeOpacity={1}
                    onPress={() => setTempMuscleIds([])}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        tempMuscleIds.length === 0 && styles.filterChipTextActive,
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
                        tempMuscleIds.includes(item.id) && styles.filterChipActive,
                      ]}
                      activeOpacity={1}
                      onPress={() => toggleTempMuscle(item.id)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          tempMuscleIds.includes(item.id) &&
                            styles.filterChipTextActive,
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
