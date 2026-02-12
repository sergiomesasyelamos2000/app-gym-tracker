import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Button, Card } from "react-native-paper";
import { RFValue } from "react-native-responsive-fontsize";
import uuid from "react-native-uuid";
import Icon from "react-native-vector-icons/MaterialIcons";

import { useTheme } from "../../../../contexts/ThemeContext";
import { ExerciseRequestDto, SetRequestDto } from "../../../../models";
import { detectRecord } from "../../../../services/recordsService";
import { useRecordsStore } from "../../../../store/useRecordsStore";
import { CelebrationAnimation } from "../CelebrationAnimation";
import ExerciseHeader from "./ExerciseHeader";
import ExerciseNotes, { ExerciseNote } from "./ExerciseNotes";
import ExerciseRestPicker from "./ExerciseRestPicker";
import ExerciseSetList from "./ExerciseSetList";
import { formatTime, parseTime } from "./helpers";

interface Props {
  exercise: ExerciseRequestDto;
  initialSets: SetRequestDto[];
  onChangeSets: (sets: SetRequestDto[]) => void;
  onChangeExercise: (exercise: ExerciseRequestDto) => void;
  readonly?: boolean;
  started?: boolean;
  onStartRestTimer?: (restSeconds: number, exerciseName?: string) => void;
  onCancelRestTimer?: () => void;
  onShowUndoSnackbar?: (message: string, onUndo: () => void) => void;
  compact?: boolean;
  onLongPress?: () => void;
  isDragging?: boolean;
  onReorder?: () => void;
  onReplace?: () => void;
  onDelete?: () => void;
  onAddSuperset?: (targetExerciseId: string) => void;
  onRemoveSuperset?: () => void;
  availableExercises?: ExerciseRequestDto[];
  supersetWith?: string;
  supersetExerciseName?: string;
  showOptions?: boolean;
  previousSessions?: any[]; // For record detection
}

const ExerciseCard = ({
  exercise,
  initialSets,
  onChangeSets,
  onChangeExercise,
  readonly = false,
  started = false,
  onStartRestTimer,
  onCancelRestTimer,
  onShowUndoSnackbar,
  compact = false,
  onLongPress,
  isDragging = false,
  onReorder,
  onReplace,
  onDelete,
  onAddSuperset,
  onRemoveSuperset,
  availableExercises = [],
  supersetWith,
  supersetExerciseName,
  showOptions = false,
  previousSessions = [],
}: Props) => {
  const [sets, setSets] = useState<SetRequestDto[]>(initialSets);
  const [notes, setNotes] = useState<ExerciseNote[]>(exercise.notes || []);
  const [restTime, setRestTime] = useState(() => {
    if (exercise.restSeconds) {
      const seconds = parseInt(exercise.restSeconds, 10);
      return formatTime({
        minutes: Math.floor(seconds / 60),
        seconds: seconds % 60,
      });
    }
    return "00:00";
  });

  // Celebration state
  const [showCelebration, setShowCelebration] = useState(false);

  // Undo deletion state
  const [pendingDelete, setPendingDelete] = useState<{
    set: SetRequestDto;
    timeoutId: ReturnType<typeof setTimeout>;
  } | null>(null);

  // Record detection state (no modal, just tracking)
  const [recordSetTypes, setRecordSetTypes] = useState<{
    [id: string]: "1RM" | "maxWeight" | "maxVolume";
  }>({});
  const addOrUpdateRecord = useRecordsStore((state) => state.addOrUpdateRecord);
  const removeRecordBySetId = useRecordsStore(
    (state) => state.removeRecordBySetId
  );

  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;
  const isMediumScreen = width < 420;
  const { theme, isDark } = useTheme();

  useEffect(() => {
    onChangeSets?.(sets);
  }, [sets]);

  useEffect(() => {
    const { minutes, seconds } = parseTime(restTime);
    onChangeExercise?.({
      ...exercise,
      notes: notes,
      restSeconds: (minutes * 60 + seconds).toString(),
    });
  }, [notes, restTime]);

  const addSet = () => {
    const newSet: SetRequestDto =
      exercise.repsType === "range"
        ? ({
            id: uuid.v4() as string,
            order: sets.length + 1,
            weight: 0,
            repsMin: 0,
            repsMax: 0,
            completed: false,
          } as SetRequestDto)
        : ({
            id: uuid.v4() as string,
            order: sets.length + 1,
            weight: 0,
            reps: 0,
            completed: false,
          } as SetRequestDto);
    setSets([...sets, newSet]);
  };

  const deleteSet = (id: string) => {
    // Find the set to delete
    const setToDelete = sets.find((set) => set.id === id);
    if (!setToDelete) return;

    // Cancel rest timer immediately if the set was completed
    if (setToDelete.completed && onCancelRestTimer) {
      onCancelRestTimer();
    }

    // Clear any existing pending deletion
    if (pendingDelete) {
      clearTimeout(pendingDelete.timeoutId);
      // Commit the previous deletion immediately
      setSets((prev) =>
        prev
          .filter((set) => set.id !== pendingDelete.set.id)
          .map((s, i) => ({ ...s, order: i + 1 }))
      );
    }

    // Set up new pending deletion with 4 second timeout
    const timeoutId = setTimeout(() => {
      commitDelete(id);
    }, 4000);

    setPendingDelete({ set: setToDelete, timeoutId });

    // Show undo snackbar at screen level
    // We pass a direct closure that captures the timeoutId to avoid stale state issues
    if (onShowUndoSnackbar) {
      onShowUndoSnackbar("Serie eliminada", () => {
        clearTimeout(timeoutId);
        setPendingDelete(null);
      });
    }
  };

  const commitDelete = (id: string) => {
    setSets((prev) =>
      prev
        .filter((set) => set.id !== id)
        .map((s, i) => ({ ...s, order: i + 1 }))
    );

    // Remove from record tracking if it was a PR
    if (recordSetTypes[id]) {
      setRecordSetTypes((prev) => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
      removeRecordBySetId(id);
    }

    setPendingDelete(null);
  };

  const handleUndo = () => {
    if (pendingDelete) {
      clearTimeout(pendingDelete.timeoutId);
      setPendingDelete(null);
    }
  };

  const updateSet = (
    id: string,
    field: keyof SetRequestDto,
    value: number | boolean
  ) => {
    // 1. Calculate the new state first
    const currentSets = sets;
    const setIndex = currentSets.findIndex((s) => s.id === id);
    if (setIndex === -1) return;

    const currentSet = currentSets[setIndex];
    const updatedSet = { ...currentSet, [field]: value };

    // Create new array with update
    const newSets = [...currentSets];
    newSets[setIndex] = updatedSet;

    // 2. Update local state
    setSets(newSets);

    // 3. Handle Side Effects (Record Detection & Rest Timer)
    // We used to do this inside setSets updater, which is bad for side effects (can run multiple times)
    if (started && previousSessions.length > 0) {
      if (
        (field === "completed" && value === true) || // Just marked completed
        (updatedSet.completed && field !== "completed") // Already completed, modifying values
      ) {
        // Start rest timer if explicitly toggling completion
        if (field === "completed" && value === true && onStartRestTimer) {
          const { minutes, seconds } = parseTime(restTime);
          const totalSeconds = minutes * 60 + seconds;
          if (totalSeconds > 0) {
            onStartRestTimer(totalSeconds, exercise.name);
          }
        }

        // Check for record
        const record = detectRecord(
          exercise.id,
          exercise.name,
          updatedSet,
          previousSessions
        );

        if (record) {
          // Only update if not already this type of record to avoid loops/dups
          if (recordSetTypes[id] !== record.type) {
            setRecordSetTypes((prev) => ({ ...prev, [id]: record.type }));
            addOrUpdateRecord(record);
            // Trigger celebration only if it wasn't already completed (fresh completion)
            if (field === "completed" && value === true) {
              setShowCelebration(true);
            }
          } else {
            // Even if typ is same, value might changed (e.g. 100kg -> 105kg), update store
            // But check logic inside store handles idempotency
            addOrUpdateRecord(record);
          }
        } else {
          // No record detected (maybe weight lowered)
          if (recordSetTypes[id]) {
            setRecordSetTypes((prev) => {
              const newState = { ...prev };
              delete newState[id];
              return newState;
            });
            removeRecordBySetId(id);
          }
        }
      } else if (field === "completed" && value === false) {
        // Unchecking completion
        if (recordSetTypes[id]) {
          setRecordSetTypes((prev) => {
            const newState = { ...prev };
            delete newState[id];
            return newState;
          });
          removeRecordBySetId(id);
        }
      }
    }
  };

  const handleWeightUnitChange = (unit: "kg" | "lbs") => {
    onChangeExercise({
      ...exercise,
      weightUnit: unit,
    });
  };

  const handleRepsTypeChange = (type: "reps" | "range") => {
    onChangeExercise({
      ...exercise,
      repsType: type,
    });
  };

  return (
    <Card
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          shadowColor: theme.shadowColor,
          padding: isSmallScreen ? 12 : isMediumScreen ? 16 : 20,
          marginVertical: isSmallScreen ? 8 : 16,
          borderWidth: isDark ? 1 : 0,
          borderColor: theme.border,
        },
      ]}
    >
      <CelebrationAnimation
        visible={showCelebration}
        onFinish={() => setShowCelebration(false)}
      />

      <TouchableOpacity
        onLongPress={onLongPress}
        delayLongPress={500}
        activeOpacity={0.9}
        disabled={readonly}
      >
        {/* 🔥 TAG DE SUPERSERIE */}
        {supersetWith && supersetExerciseName && (
          <View
            style={[
              styles.supersetTag,
              {
                backgroundColor: theme.primary + "20",
                borderColor: theme.primary + "40",
                paddingHorizontal: isSmallScreen ? 10 : 12,
                paddingVertical: isSmallScreen ? 6 : 8,
                marginBottom: isSmallScreen ? 8 : 12,
              },
            ]}
          >
            <Icon
              name="link"
              size={isSmallScreen ? 14 : 16}
              color={theme.primary}
            />
            <Text
              style={[
                styles.supersetTagText,
                {
                  color: theme.primary,
                  fontSize: RFValue(isSmallScreen ? 11 : 12),
                },
              ]}
            >
              Superserie: {supersetExerciseName}
            </Text>

            {/* 🔥 BOTÓN PARA ELIMINAR SUPERSERIE (solo en edición) */}
            {showOptions && onRemoveSuperset && (
              <TouchableOpacity
                onPress={onRemoveSuperset}
                style={[
                  styles.removeSuperset,
                  { backgroundColor: theme.primary + "33" },
                ]}
              >
                <Icon name="close" size={16} color={theme.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        <ExerciseHeader
          exercise={exercise}
          readonly={readonly}
          onReorder={onReorder}
          onReplace={onReplace}
          onDelete={onDelete}
          onAddSuperset={onAddSuperset}
          onRemoveSuperset={onRemoveSuperset}
          availableExercises={availableExercises}
          showOptions={showOptions}
          hasSuperset={!!supersetWith}
        />

        <ExerciseNotes notes={notes} onChange={setNotes} readonly={readonly} />

        <ExerciseRestPicker
          restTime={restTime}
          setRestTime={setRestTime}
          readonly={readonly}
        />

        <ExerciseSetList
          sets={sets.filter((set) => set.id !== pendingDelete?.set.id)}
          onUpdate={updateSet}
          onDelete={deleteSet}
          weightUnit={exercise.weightUnit || "kg"}
          repsType={exercise.repsType || "reps"}
          onWeightUnitChange={handleWeightUnitChange}
          onRepsTypeChange={handleRepsTypeChange}
          readonly={readonly}
          started={started}
          recordSetTypes={recordSetTypes} // Pass record set types
        />

        {!readonly && (
          <Button
            mode="contained"
            onPress={addSet}
            style={[
              styles.addButton,
              {
                backgroundColor: theme.primary,
                paddingVertical: isSmallScreen ? 4 : 8,
                marginTop: isSmallScreen ? 12 : 20,
              },
            ]}
            labelStyle={{
              fontSize: RFValue(isSmallScreen ? 13 : 15),
              fontWeight: "600",
            }}
            icon="plus"
          >
            Añadir Serie
          </Button>
        )}
      </TouchableOpacity>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 16,
    padding: 20,
    borderRadius: 20,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  addButton: {
    marginTop: 20,
    borderRadius: 12,
    paddingVertical: 8,
    elevation: 2,
  },
  supersetTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginBottom: 12,
    gap: 6,
    borderWidth: 1,
    minWidth: 0,
  },
  supersetTagText: {
    fontSize: RFValue(12),
    fontWeight: "600",
    flexShrink: 1,
  },
  removeSuperset: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },
});

export default ExerciseCard;
