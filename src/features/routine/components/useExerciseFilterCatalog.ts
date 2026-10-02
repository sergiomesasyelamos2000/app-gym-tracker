import type { EquipmentDto, MuscleDto } from "@sergiomesasyelamos2000/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { InteractionManager } from "react-native";
import {
  getEquipmentAliasKeys,
  getMuscleAliasKeys,
} from "../utils/exerciseAliasKeys";
import {
  buildExerciseFilterIndex,
  rankChipsFromIndex,
  type ExerciseFilterIndex,
  type RankedFilterChips,
  type SearchableExercise,
} from "../utils/exerciseFilterIndex";
import { mergeFilterOptionsByAlias } from "../utils/exerciseSearch";

const EMPTY_EQUIPMENT_RANKED: RankedFilterChips<EquipmentDto> = {
  top: [],
  all: [],
};

const EMPTY_MUSCLE_RANKED: RankedFilterChips<MuscleDto> = {
  top: [],
  all: [],
};

export type UseExerciseFilterCatalogArgs<T extends SearchableExercise> = {
  exercises: readonly T[];
  equipmentOptions: EquipmentDto[];
  muscleOptions: MuscleDto[];
  listPaintReady: boolean;
  maxEquipmentOptions: number;
  maxMuscleOptions: number;
};

export type UseExerciseFilterCatalogResult = {
  filterIndex: ExerciseFilterIndex | null;
  equipmentRanked: RankedFilterChips<EquipmentDto>;
  muscleRanked: RankedFilterChips<MuscleDto>;
  equipmentById: ReadonlyMap<string, EquipmentDto>;
  muscleById: ReadonlyMap<string, MuscleDto>;
};

/**
 * Idle-builds the filter index after the list paints, then ranks chips when
 * official equipment/muscle options arrive (no second catalog walk).
 */
export function useExerciseFilterCatalog<T extends SearchableExercise>({
  exercises,
  equipmentOptions,
  muscleOptions,
  listPaintReady,
  maxEquipmentOptions,
  maxMuscleOptions,
}: UseExerciseFilterCatalogArgs<T>): UseExerciseFilterCatalogResult {
  const [filterIndex, setFilterIndex] = useState<ExerciseFilterIndex | null>(
    null
  );
  const revisionRef = useRef(0);

  useEffect(() => {
    if (!listPaintReady || exercises.length === 0) {
      setFilterIndex(null);
      return;
    }

    revisionRef.current += 1;
    const revision = revisionRef.current;
    let cancelled = false;

    const handle = InteractionManager.runAfterInteractions(() => {
      if (cancelled) return;
      const next = buildExerciseFilterIndex(exercises, revision);
      if (cancelled || revision !== revisionRef.current) return;
      setFilterIndex(next);
    });

    return () => {
      cancelled = true;
      handle.cancel?.();
    };
  }, [listPaintReady, exercises]);

  const equipmentRanked = useMemo(() => {
    if (!filterIndex) return EMPTY_EQUIPMENT_RANKED;
    const combined = mergeFilterOptionsByAlias(
      equipmentOptions,
      [...filterIndex.derivedEquipmentNames],
      getEquipmentAliasKeys,
      "derived-equipment-"
    );
    return rankChipsFromIndex(
      combined,
      filterIndex.usageByEquipment,
      maxEquipmentOptions,
      getEquipmentAliasKeys
    );
  }, [filterIndex, equipmentOptions, maxEquipmentOptions]);

  const muscleRanked = useMemo(() => {
    if (!filterIndex) return EMPTY_MUSCLE_RANKED;
    const combined = mergeFilterOptionsByAlias(
      muscleOptions,
      [...filterIndex.derivedMuscleNames],
      getMuscleAliasKeys,
      "derived-muscle-"
    );
    return rankChipsFromIndex(
      combined,
      filterIndex.usageByMuscle,
      maxMuscleOptions,
      getMuscleAliasKeys
    );
  }, [filterIndex, muscleOptions, maxMuscleOptions]);

  const equipmentById = useMemo(() => {
    const map = new Map<string, EquipmentDto>();
    equipmentRanked.all.forEach((item) => map.set(item.id, item));
    return map;
  }, [equipmentRanked]);

  const muscleById = useMemo(() => {
    const map = new Map<string, MuscleDto>();
    muscleRanked.all.forEach((item) => map.set(item.id, item));
    return map;
  }, [muscleRanked]);

  return {
    filterIndex,
    equipmentRanked,
    muscleRanked,
    equipmentById,
    muscleById,
  };
}
