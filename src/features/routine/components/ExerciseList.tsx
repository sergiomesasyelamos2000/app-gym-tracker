import {
  NavigationProp,
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  InteractionManager,
  ListRenderItem,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
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
import { ScreenHeader } from "../../common/components/ScreenHeader";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  fetchEquipment,
  fetchMuscles,
  fetchExercises,
  isUsingCache,
  peekExerciseCatalog,
} from "../../../services/exerciseService";
import ExerciseItem from "../components/ExerciseItem";
import { ExerciseFilterModal } from "../components/ExerciseFilterModal";
import { ExerciseListSkeleton } from "../components/ExerciseListSkeleton";
import { EXERCISE_LIST_ROW_STRIDE } from "../components/exerciseListLayout";
import { useExerciseFilterCatalog } from "../components/useExerciseFilterCatalog";
import { WorkoutStackParamList } from "../screens/WorkoutStack";
import { useExerciseSelectionStore } from "../../../store/useExerciseSelectionStore";
import {
  normalizeExerciseImage,
  normalizeExercisesImage,
} from "../utils/normalizeExerciseImage";
import {
  EMPTY_FILTER_NAMES,
  filterAndSortExercises,
  idsToNames,
  remapFilterSelectionIds,
  DERIVED_EQUIPMENT_PREFIX,
  DERIVED_MUSCLE_PREFIX,
  type ExerciseFilterDraft,
} from "../utils/exerciseSearch";
import {
  getEquipmentAliasKeys,
  getMuscleAliasKeys,
} from "../utils/exerciseAliasKeys";
import {
  prefetchExerciseThumbBatch,
  waitForExerciseThumbBatch,
} from "../utils/prefetchExerciseThumbs";
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
const THUMB_PREFETCH_INITIAL = 18;
const THUMB_PREFETCH_LOOKAHEAD = 8;
const THUMB_PREFETCH_LIMIT = 30;
const THUMB_REVEAL_WAIT_COUNT = 10;
const THUMB_REVEAL_TIMEOUT_MS = 450;

const EMPTY_FILTER_DRAFT: ExerciseFilterDraft = Object.freeze({
  equipmentIds: EMPTY_FILTER_NAMES,
  muscleIds: EMPTY_FILTER_NAMES,
});

const viewabilityConfig = {
  itemVisiblePercentThreshold: 10,
  minimumViewTime: 40,
};

export default function ExerciseList() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
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
  const [modalSeed, setModalSeed] =
    useState<ExerciseFilterDraft>(EMPTY_FILTER_DRAFT);
  const [equipmentOptions, setEquipmentOptions] = useState<EquipmentDto[]>([]);
  const [muscleOptions, setMuscleOptions] = useState<MuscleDto[]>([]);

  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const inputAccessoryProps =
    Platform.OS === "ios"
      ? { inputAccessoryViewID: GLOBAL_KEYBOARD_ACCESSORY_ID }
      : {};
  const [selectedExercises, setSelectedExercises] = useState<
    ExerciseRequestDto[]
  >([]);
  const seededCatalogRef = useRef(peekExerciseCatalog());
  const [allExercises, setAllExercises] = useState<ExerciseListItem[]>(() => {
    const peeked = seededCatalogRef.current;
    return peeked?.length ? (peeked as ExerciseListItem[]) : [];
  });
  const [loading, setLoading] = useState(() => seededCatalogRef.current == null);
  const [listPaintReady, setListPaintReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<ExerciseListItem>>(null);
  const scrollOffsetRef = useRef(0);
  const selectedIdSet = useMemo(
    () => new Set(selectedExercises.map((item) => item.id)),
    [selectedExercises]
  );

  const consumePendingCreatedExercise = useExerciseSelectionStore(
    (state) => state.consumePendingCreatedExercise
  );
  const setSelectionContext = useExerciseSelectionStore(
    (state) => state.setSelectionContext
  );
  const clearSelectionContext = useExerciseSelectionStore(
    (state) => state.clearSelectionContext
  );

  const {
    filterIndex,
    equipmentRanked,
    muscleRanked,
    equipmentById,
    muscleById,
  } = useExerciseFilterCatalog({
    exercises: allExercises,
    equipmentOptions,
    muscleOptions,
    listPaintReady,
    maxEquipmentOptions: MAX_EQUIPMENT_FILTER_OPTIONS,
    maxMuscleOptions: MAX_MUSCLE_FILTER_OPTIONS,
  });

  const selectedEquipmentNames = useMemo(
    () => idsToNames(equipmentById, selectedEquipmentIds),
    [equipmentById, selectedEquipmentIds]
  );
  const selectedMuscleNames = useMemo(
    () => idsToNames(muscleById, selectedMuscleIds),
    [muscleById, selectedMuscleIds]
  );
  const selectedEquipmentFilters = useMemo(
    () =>
      selectedEquipmentIds
        .map((id) => equipmentById.get(id))
        .filter((item): item is EquipmentDto => Boolean(item)),
    [equipmentById, selectedEquipmentIds]
  );
  const selectedMuscleFilters = useMemo(
    () =>
      selectedMuscleIds
        .map((id) => muscleById.get(id))
        .filter((item): item is MuscleDto => Boolean(item)),
    [muscleById, selectedMuscleIds]
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

  const appliedFilterSignature = `${searchQuery}\0${selectedEquipmentIds.join(",")}\0${selectedMuscleIds.join(",")}`;

  // Official options replace derived-* chip ids — keep applied filters working.
  useEffect(() => {
    if (equipmentRanked.all.length === 0) return;
    setSelectedEquipmentIds((prev) => {
      if (prev.length === 0) return prev;
      const next = remapFilterSelectionIds(
        prev,
        equipmentRanked.all,
        getEquipmentAliasKeys,
        DERIVED_EQUIPMENT_PREFIX
      );
      if (
        next.length === prev.length &&
        next.every((id, index) => id === prev[index])
      ) {
        return prev;
      }
      return next;
    });
  }, [equipmentRanked]);

  useEffect(() => {
    if (muscleRanked.all.length === 0) return;
    setSelectedMuscleIds((prev) => {
      if (prev.length === 0) return prev;
      const next = remapFilterSelectionIds(
        prev,
        muscleRanked.all,
        getMuscleAliasKeys,
        DERIVED_MUSCLE_PREFIX
      );
      if (
        next.length === prev.length &&
        next.every((id, index) => id === prev[index])
      ) {
        return prev;
      }
      return next;
    });
  }, [muscleRanked]);

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
    const hasSeed = seededCatalogRef.current != null;
    try {
      if (!hasSeed) {
        setLoading(true);
      }
      setError(null);
      setIsOfflineMode(false);
      const data = await fetchExercises();

      // Same in-memory catalog already seeded — skip a second full normalize/render pass.
      if (data !== seededCatalogRef.current) {
        seededCatalogRef.current = data;
        setAllExercises(normalizeExercisesImage(data as ExerciseListItem[]));
      }

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
    if (!listPaintReady) return;
    void loadFilterOptions();
  }, [listPaintReady, loadFilterOptions]);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  const revealListAfterThumbWarmup = useCallback(async () => {
    const catalog = seededCatalogRef.current;
    if (catalog?.length) {
      prefetchExerciseThumbBatch(catalog, {
        startIndex: 0,
        count: THUMB_PREFETCH_INITIAL,
        limit: THUMB_PREFETCH_LIMIT,
      });
      await waitForExerciseThumbBatch(catalog, {
        startIndex: 0,
        count: THUMB_REVEAL_WAIT_COUNT,
        limit: THUMB_REVEAL_WAIT_COUNT,
        timeoutMs: THUMB_REVEAL_TIMEOUT_MS,
      });
    }

    setAllExercises((prev) =>
      prev.length > 0 ? normalizeExercisesImage(prev) : prev
    );
    setListPaintReady(true);
  }, []);

  // Warm path: catalog already in memory — prefetch during skeleton, then reveal.
  useEffect(() => {
    if (!seededCatalogRef.current?.length) return;

    let cancelled = false;
    const handle = InteractionManager.runAfterInteractions(() => {
      void (async () => {
        if (cancelled) return;
        await revealListAfterThumbWarmup();
      })();
    });

    return () => {
      cancelled = true;
      handle.cancel?.();
    };
  }, [revealListAfterThumbWarmup]);

  // Cold path: catalog arrives after fetch while skeleton is still up.
  useEffect(() => {
    if (listPaintReady || loading) return;
    if (seededCatalogRef.current?.length) return;
    if (allExercises.length === 0) return;

    let cancelled = false;
    void (async () => {
      prefetchExerciseThumbBatch(allExercises, {
        startIndex: 0,
        count: THUMB_PREFETCH_INITIAL,
        limit: THUMB_PREFETCH_LIMIT,
      });
      await waitForExerciseThumbBatch(allExercises, {
        startIndex: 0,
        count: THUMB_REVEAL_WAIT_COUNT,
        limit: THUMB_REVEAL_WAIT_COUNT,
        timeoutMs: THUMB_REVEAL_TIMEOUT_MS,
      });
      if (cancelled) return;
      setAllExercises((prev) => normalizeExercisesImage(prev));
      setListPaintReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    allExercises,
    listPaintReady,
    loading,
  ]);

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
    if (!listPaintReady || !allExercises.length) return [];

    return filterAndSortExercises(allExercises, {
      searchQuery,
      selectedEquipmentNames,
      selectedMuscleNames,
      index: filterIndex ?? undefined,
    });
  }, [
    listPaintReady,
    allExercises,
    searchQuery,
    selectedEquipmentNames,
    selectedMuscleNames,
    filterIndex,
  ]);

  const filteredExercisesRef = useRef(filteredExercises);
  filteredExercisesRef.current = filteredExercises;

  const filteredHeadSignature = useMemo(
    () =>
      filteredExercises
        .slice(0, THUMB_PREFETCH_INITIAL)
        .map((item) => item.id)
        .join(","),
    [filteredExercises]
  );

  // Warm the first window of thumbs when the visible head actually changes.
  useEffect(() => {
    if (!listPaintReady || !filteredHeadSignature) return;
    const handle = InteractionManager.runAfterInteractions(() => {
      prefetchExerciseThumbBatch(filteredExercisesRef.current, {
        startIndex: 0,
        count: THUMB_PREFETCH_INITIAL,
        limit: THUMB_PREFETCH_LIMIT,
      });
    });
    return () => {
      handle.cancel?.();
    };
  }, [listPaintReady, filteredHeadSignature]);

  const onViewableItemsChanged = useRef(
    ({
      viewableItems,
    }: {
      viewableItems: Array<{ index: number | null }>;
    }) => {
      const data = filteredExercisesRef.current;
      if (!data.length || viewableItems.length === 0) return;

      const indices = viewableItems
        .map((item) => item.index)
        .filter((index): index is number => typeof index === "number");
      if (indices.length === 0) return;

      const first = Math.min(...indices);
      const last = Math.max(...indices);
      prefetchExerciseThumbBatch(data, {
        startIndex: first,
        count: last - first + 1 + THUMB_PREFETCH_LOOKAHEAD,
        limit: THUMB_PREFETCH_LIMIT,
      });
    }
  ).current;

  const handleListScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
    },
    []
  );

  useEffect(() => {
    if (!listPaintReady) return;
    if (scrollOffsetRef.current <= 0) return;
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    scrollOffsetRef.current = 0;
  }, [appliedFilterSignature, listPaintReady]);

  const clearSearchQuery = () => {
    setSearchQuery("");
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    scrollOffsetRef.current = 0;
  };

  const handleSelectExercise = useCallback(
    (exercise: ExerciseRequestDto) => {
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
    },
    [singleSelection]
  );

  const renderExerciseItem = useCallback<ListRenderItem<ExerciseListItem>>(
    ({ item }) => (
      <ExerciseItem
        item={item}
        isSelected={selectedIdSet.has(item.id)}
        onSelect={handleSelectExercise}
      />
    ),
    [handleSelectExercise, selectedIdSet]
  );

  const getExerciseItemLayout = useCallback(
    (_: ArrayLike<ExerciseListItem> | null | undefined, index: number) => ({
      length: EXERCISE_LIST_ROW_STRIDE,
      offset: EXERCISE_LIST_ROW_STRIDE * index,
      index,
    }),
    []
  );

  const handleConfirm = () => {
    if (selectedExercises.length === 0) return;

    if (mode === "replaceExercise" && replaceExerciseId) {
      if (returnTo === "RoutineDetail") {
        navigation.navigate(
          "RoutineDetail",
          {
            ...(routineId ? { routineId } : {}),
            replaceExerciseId,
            replacementExercise: selectedExercises[0],
          },
          { merge: true, pop: true }
        );
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

    if (mode === "addToRoutine") {
      if (returnTo === "RoutineDetail") {
        // Pop back to the workout already on the stack. A plain navigate
        // pushes a new RoutineDetail and drops the in-progress session.
        navigation.navigate(
          "RoutineDetail",
          { addExercises: selectedExercises },
          { merge: true, pop: true }
        );
        clearSelectionContext();
        return;
      }

      if (routineId) {
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

  const openFiltersModal = useCallback(() => {
    setModalSeed({
      equipmentIds: selectedEquipmentIds,
      muscleIds: selectedMuscleIds,
    });
    setShowFiltersModal(true);
  }, [selectedEquipmentIds, selectedMuscleIds]);

  const closeFiltersModal = useCallback(() => {
    setShowFiltersModal(false);
  }, []);

  const applyFiltersModal = useCallback(
    (draft: ExerciseFilterDraft) => {
      setSelectedEquipmentIds(
        remapFilterSelectionIds(
          draft.equipmentIds,
          equipmentRanked.all,
          getEquipmentAliasKeys,
          DERIVED_EQUIPMENT_PREFIX
        )
      );
      setSelectedMuscleIds(
        remapFilterSelectionIds(
          draft.muscleIds,
          muscleRanked.all,
          getMuscleAliasKeys,
          DERIVED_MUSCLE_PREFIX
        )
      );
    },
    [equipmentRanked.all, muscleRanked.all]
  );

  const clearEquipmentFilters = () => {
    setSelectedEquipmentIds([]);
  };

  const clearMuscleFilters = () => {
    setSelectedMuscleIds([]);
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        Platform.OS === "android" ? { paddingTop: insets.top } : null,
      ]}
    >
      <ScreenHeader
        title="Listado de Ejercicios"
        onBack={() => navigation.goBack()}
      />
      {error && allExercises.length === 0 ? (
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

          <ExerciseFilterModal
            visible={showFiltersModal}
            equipmentRanked={equipmentRanked}
            muscleRanked={muscleRanked}
            seed={modalSeed}
            onApply={applyFiltersModal}
            onClose={closeFiltersModal}
          />

          <View style={styles.listContainer}>
            {!listPaintReady || (loading && allExercises.length === 0) ? (
              <ExerciseListSkeleton />
            ) : (
              <FlatList
                ref={listRef}
                data={filteredExercises}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.listContent}
                renderItem={renderExerciseItem}
                extraData={selectedIdSet}
                windowSize={5}
                initialNumToRender={10}
                maxToRenderPerBatch={8}
                updateCellsBatchingPeriod={50}
                removeClippedSubviews={false}
                getItemLayout={getExerciseItemLayout}
                onScroll={handleListScroll}
                scrollEventThrottle={16}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
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
            )}
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
      backgroundColor: theme.backgroundSecondary,
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
    listContent: {
      paddingTop: 4,
      paddingBottom: 16,
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
