import {
  NavigationProp,
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import Icon from "react-native-vector-icons/MaterialIcons";
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
import {
  buildCombinedEquipmentOptions,
  buildCombinedMuscleOptions,
  filterAndSortExercises,
  getEquipmentAliasKeys,
  getMuscleAliasKeys,
  rankFilterOptionsByUsage,
  toFilterKey,
} from "../utils/exerciseSearch";
import { GLOBAL_KEYBOARD_ACCESSORY_ID } from "../../../components/KeyboardDismissButton";

type ExerciseListRouteProp = RouteProp<WorkoutStackParamList, "ExerciseList">;

type ExerciseListItem = ExerciseRequestDto & {
  equipments?: string[];
  targetMuscles?: string[];
  secondaryMuscles?: string[];
  bodyParts?: string[];
  keywords?: string[];
};

const MAX_EQUIPMENT_FILTER_OPTIONS = 24;
const MAX_MUSCLE_FILTER_OPTIONS = 24;

export default function ExerciseList() {
  const { theme } = useTheme();
  const route = useRoute<ExerciseListRouteProp>();
  const navigation = useNavigation<NavigationProp<WorkoutStackParamList>>();

  const {
    routineId,
    mode = "createRoutine",
    replaceExerciseId,
    singleSelection = false,
    draftTitle,
    draftExercises,
    returnTo = "RoutineEdit",
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

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const modalTranslateY = useRef(new Animated.Value(300)).current;

  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const inputAccessoryProps =
    Platform.OS === "ios"
      ? { inputAccessoryViewID: GLOBAL_KEYBOARD_ACCESSORY_ID }
      : {};
  const [selectedExercises, setSelectedExercises] = useState<
    ExerciseRequestDto[]
  >([]);
  const [allExercises, setAllExercises] = useState<ExerciseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<ExerciseListItem>>(null);

  const consumePendingCreatedExercise = useExerciseSelectionStore(
    (state) => state.consumePendingCreatedExercise
  );
  const setSelectionContext = useExerciseSelectionStore(
    (state) => state.setSelectionContext
  );
  const clearSelectionContext = useExerciseSelectionStore(
    (state) => state.clearSelectionContext
  );

  const combinedMuscleOptions = useMemo(
    () => buildCombinedMuscleOptions(muscleOptions, allExercises),
    [allExercises, muscleOptions]
  );
  const combinedEquipmentOptions = useMemo(
    () => buildCombinedEquipmentOptions(equipmentOptions, allExercises),
    [allExercises, equipmentOptions]
  );
  const selectedEquipmentNames = useMemo(
    () =>
      combinedEquipmentOptions
        .filter((item) => selectedEquipmentIds.includes(item.id))
        .map((item) => item.name),
    [combinedEquipmentOptions, selectedEquipmentIds]
  );
  const selectedEquipmentFilters = useMemo(
    () =>
      combinedEquipmentOptions.filter((item) =>
        selectedEquipmentIds.includes(item.id)
      ),
    [combinedEquipmentOptions, selectedEquipmentIds]
  );
  const selectedMuscleNames = useMemo(
    () =>
      combinedMuscleOptions
        .filter((item) => selectedMuscleIds.includes(item.id))
        .map((item) => item.name),
    [combinedMuscleOptions, selectedMuscleIds]
  );
  const selectedMuscleFilters = useMemo(
    () =>
      combinedMuscleOptions.filter((item) =>
        selectedMuscleIds.includes(item.id)
      ),
    [combinedMuscleOptions, selectedMuscleIds]
  );
  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      selectedEquipmentIds.length ||
      selectedMuscleIds.length
  );
  const hasSelectionFilters = Boolean(
    selectedEquipmentIds.length || selectedMuscleIds.length
  );
  const selectionFiltersCount =
    selectedEquipmentIds.length + selectedMuscleIds.length;

  const displayedEquipmentOptions = useMemo(() => {
    const usageByEquipment = new Map<string, number>();

    allExercises.forEach((exercise) => {
      (exercise.equipments || []).forEach((equipmentName) => {
        getEquipmentAliasKeys(equipmentName).forEach((key) => {
          usageByEquipment.set(key, (usageByEquipment.get(key) || 0) + 1);
        });
        const rawKey = toFilterKey(equipmentName);
        if (rawKey) {
          usageByEquipment.set(
            rawKey,
            (usageByEquipment.get(rawKey) || 0) + 1
          );
        }
      });
    });

    return rankFilterOptionsByUsage(
      combinedEquipmentOptions,
      usageByEquipment,
      tempEquipmentIds,
      MAX_EQUIPMENT_FILTER_OPTIONS,
      getEquipmentAliasKeys
    );
  }, [allExercises, combinedEquipmentOptions, tempEquipmentIds]);

  const displayedMuscleOptions = useMemo(() => {
    const usageByMuscle = new Map<string, number>();

    allExercises.forEach((exercise) => {
      [
        ...(exercise.targetMuscles || []),
        ...(exercise.secondaryMuscles || []),
        ...(exercise.bodyParts || []),
      ].forEach((muscleName) => {
        getMuscleAliasKeys(muscleName).forEach((key) => {
          usageByMuscle.set(key, (usageByMuscle.get(key) || 0) + 1);
        });
        const rawKey = toFilterKey(muscleName);
        if (rawKey) {
          usageByMuscle.set(rawKey, (usageByMuscle.get(rawKey) || 0) + 1);
        }
      });
    });

    return rankFilterOptionsByUsage(
      combinedMuscleOptions,
      usageByMuscle,
      tempMuscleIds,
      MAX_MUSCLE_FILTER_OPTIONS,
      getMuscleAliasKeys
    );
  }, [allExercises, combinedMuscleOptions, tempMuscleIds]);

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

    return filterAndSortExercises(allExercises, {
      searchQuery,
      selectedEquipmentNames,
      selectedMuscleNames,
    });
  }, [
    allExercises,
    searchQuery,
    selectedEquipmentNames,
    selectedMuscleNames,
  ]);

  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [searchQuery, selectedMuscleIds, selectedEquipmentIds]);

  const clearSearchQuery = () => {
    setSearchQuery("");
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

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

    if (mode === "replaceExercise" && replaceExerciseId) {
      if (returnTo === "RoutineDetail") {
        navigation.navigate({
          name: "RoutineDetail",
          params: {
            ...(routineId ? { routineId } : {}),
            replaceExerciseId,
            replacementExercise: selectedExercises[0],
          },
          merge: true,
        });
      } else if (routineId) {
        navigation.navigate({
          name: "RoutineEdit",
          params: {
            id: routineId,
            title: draftTitle,
            exercises: draftExercises,
            replaceExerciseId,
            replacementExercise: selectedExercises[0],
          },
          merge: true,
        });
      }
      clearSelectionContext();
      return;
    }

    if (mode === "addToRoutine" && routineId) {
      navigation.navigate({
        name: "RoutineEdit",
        params: {
          id: routineId,
          title: draftTitle,
          exercises: draftExercises,
          addExercises: selectedExercises,
        },
        merge: true,
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
    overlayOpacity.setValue(0);
    modalTranslateY.setValue(300);
    setShowFiltersModal(true);
  };

  const animateFiltersModalOpen = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(modalTranslateY, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateFiltersModalClose = (callback: () => void) => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 250,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(modalTranslateY, {
        toValue: 300,
        duration: 250,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback();
    });
  };

  const closeFiltersModal = () => {
    animateFiltersModalClose(() => setShowFiltersModal(false));
  };

  const applyFiltersModal = () => {
    animateFiltersModalClose(() => {
      setSelectedEquipmentIds(tempEquipmentIds);
      setSelectedMuscleIds(tempMuscleIds);
      setShowFiltersModal(false);
    });
  };

  const removeEquipmentFilter = (id: string) => {
    setSelectedEquipmentIds((prev) => prev.filter((item) => item !== id));
  };

  const clearEquipmentFilters = () => {
    setSelectedEquipmentIds([]);
  };

  const removeMuscleFilter = (id: string) => {
    setSelectedMuscleIds((prev) => prev.filter((item) => item !== id));
  };

  const clearMuscleFilters = () => {
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
                Modo sin conexión - Mostrando ejercicios guardados
              </Text>
            </View>
          )}

          <View style={styles.header}>
            <Text style={styles.headerTitle}>Listado de Ejercicios</Text>
            <View style={styles.searchInputContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar ejercicio..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={theme.textTertiary}
                {...inputAccessoryProps}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  style={styles.clearSearchButton}
                  onPress={clearSearchQuery}
                  accessibilityRole="button"
                  accessibilityLabel="Limpiar busqueda"
                >
                  <Icon
                    name="close"
                    size={RFValue(16)}
                    color={theme.textSecondary}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.filterActionsRow}>
            <TouchableOpacity
              style={styles.openFiltersButton}
              onPress={openFiltersModal}
            >
              <Text style={styles.openFiltersText}>
                Filtros
                {selectionFiltersCount > 0 ? ` (${selectionFiltersCount})` : ""}
              </Text>
            </TouchableOpacity>
            {hasActiveFilters && (
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={clearFilters}
              >
                <Text style={styles.clearFiltersText}>Limpiar todo</Text>
              </TouchableOpacity>
            )}
          </View>

          {hasSelectionFilters && (
            <View style={styles.activeFiltersRow}>
              {selectedEquipmentFilters.length > 0 && (
                <View style={styles.activeFilterPill}>
                  <Text style={styles.activeFilterPillText}>
                    <Text style={styles.activeFilterPillLabel}>Equipo: </Text>
                    {selectedEquipmentFilters.map((item) => item.name).join(", ")}
                  </Text>
                  <TouchableOpacity
                    style={styles.activeFilterPillClose}
                    onPress={clearEquipmentFilters}
                    accessibilityRole="button"
                    accessibilityLabel="Quitar filtro de equipo"
                  >
                    <Icon
                      name="close"
                      size={RFValue(12)}
                      color={theme.primary}
                    />
                  </TouchableOpacity>
                </View>
              )}
              {selectedMuscleFilters.length > 0 && (
                <View style={styles.activeFilterPill}>
                  <Text style={styles.activeFilterPillText}>
                    <Text style={styles.activeFilterPillLabel}>Músculo: </Text>
                    {selectedMuscleFilters.map((item) => item.name).join(", ")}
                  </Text>
                  <TouchableOpacity
                    style={styles.activeFilterPillClose}
                    onPress={clearMuscleFilters}
                    accessibilityRole="button"
                    accessibilityLabel="Quitar filtro de músculo"
                  >
                    <Icon
                      name="close"
                      size={RFValue(12)}
                      color={theme.primary}
                    />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          <Modal
            visible={showFiltersModal}
            transparent
            animationType="none"
            onRequestClose={closeFiltersModal}
            onShow={animateFiltersModalOpen}
            statusBarTranslucent={Platform.OS === "android"}
          >
            <TouchableWithoutFeedback onPress={closeFiltersModal}>
              <Animated.View
                style={[styles.modalOverlay, { opacity: overlayOpacity }]}
              >
                <TouchableWithoutFeedback>
                  <Animated.View
                    style={[
                      styles.modalContent,
                      { transform: [{ translateY: modalTranslateY }] },
                    ]}
                  >
                    <View style={styles.modalHandle} />
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
                          tempEquipmentIds.length === 0 &&
                            styles.filterChipActive,
                        ]}
                        activeOpacity={1}
                        onPress={() => setTempEquipmentIds([])}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            tempEquipmentIds.length === 0 &&
                              styles.filterChipTextActive,
                          ]}
                        >
                          Todos
                        </Text>
                      </TouchableOpacity>
                      {displayedEquipmentOptions.map((item) => (
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

                    <Text style={styles.modalSectionTitle}>Músculo</Text>
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
                            tempMuscleIds.length === 0 &&
                              styles.filterChipTextActive,
                          ]}
                        >
                          Todos
                        </Text>
                      </TouchableOpacity>
                      {displayedMuscleOptions.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={[
                            styles.filterChip,
                            tempMuscleIds.includes(item.id) &&
                              styles.filterChipActive,
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
                        <Text style={styles.modalSecondaryButtonText}>
                          Limpiar
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.modalSecondaryButton}
                        onPress={closeFiltersModal}
                      >
                        <Text style={styles.modalSecondaryButtonText}>
                          Cancelar
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.modalPrimaryButton}
                        onPress={applyFiltersModal}
                      >
                        <Text style={styles.modalPrimaryButtonText}>
                          Aplicar
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </Animated.View>
                </TouchableWithoutFeedback>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Modal>

          <View style={styles.listContainer}>
            <FlatList
              ref={listRef}
              data={filteredExercises}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
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
    searchInputContainer: {
      backgroundColor: theme.card,
      borderRadius: 12,
      paddingHorizontal: 12,
      elevation: 2,
      borderWidth: 1,
      borderColor: theme.border,
      flexDirection: "row",
      alignItems: "center",
    },
    searchInput: {
      flex: 1,
      paddingVertical: 8,
      fontSize: RFValue(16),
      color: theme.text,
    },
    clearSearchButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.background,
      marginLeft: 8,
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
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    activeFilterPillText: {
      color: theme.primary,
      fontWeight: "400",
      fontSize: RFValue(12),
    },
    activeFilterPillLabel: {
      fontWeight: "700",
    },
    activeFilterPillClose: {
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: `${theme.primary}22`,
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
      backgroundColor: theme.overlay,
    },
    modalContent: {
      maxHeight: "80%",
      backgroundColor: theme.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    modalHandle: {
      width: 40,
      height: 4,
      backgroundColor: theme.border,
      borderRadius: 2,
      alignSelf: "center",
      marginTop: 12,
      marginBottom: 16,
    },
    modalTitle: {
      color: theme.text,
      fontSize: RFValue(18),
      fontWeight: "700",
      textAlign: "center",
      marginBottom: 20,
    },
    modalSectionTitle: {
      color: theme.textSecondary,
      fontSize: RFValue(13),
      fontWeight: "700",
      marginBottom: 8,
      marginTop: 6,
    },
    modalSectionScroll: {
      maxHeight: 180,
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
      marginTop: 16,
    },
    modalSecondaryButton: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.backgroundSecondary,
      paddingVertical: 14,
      alignItems: "center",
    },
    modalSecondaryButtonText: {
      color: theme.textSecondary,
      fontSize: RFValue(13),
      fontWeight: "600",
    },
    modalPrimaryButton: {
      flex: 1,
      borderRadius: 12,
      backgroundColor: theme.primary,
      paddingVertical: 14,
      alignItems: "center",
    },
    modalPrimaryButtonText: {
      color: theme.onPrimary,
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
