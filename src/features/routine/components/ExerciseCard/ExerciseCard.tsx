import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Button, Card } from "react-native-paper";
import { RFValue } from "react-native-responsive-fontsize";
import uuid from "react-native-uuid";
import Icon from "react-native-vector-icons/MaterialIcons";

import { useTheme } from "../../../../contexts/ThemeContext";
import { ExerciseRequestDto, SetRequestDto } from "../../../../models";
import { detectRecord } from "../../../../services/recordsService";
import { useRecordsStore } from "../../../../store/useRecordsStore";
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

  // Record detection state (no modal, just tracking)
  const [recordSetTypes, setRecordSetTypes] = useState<{
    [id: string]: "1RM" | "maxWeight" | "maxVolume";
  }>({});
  const addRecord = useRecordsStore((state) => state.addRecord);

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
        ? {
            id: uuid.v4() as string,
            order: sets.length + 1,
            weight: 0,
            repsMin: 0,
            repsMax: 0,
            completed: false,
          }
        : {
            id: uuid.v4() as string,
            order: sets.length + 1,
            weight: 0,
            reps: 0,
            completed: false,
          };
    setSets([...sets, newSet]);
  };

  const deleteSet = (id: string) => {
    setSets((prev) =>
      prev
        .filter((set) => set.id !== id)
        .map((s, i) => ({ ...s, order: i + 1 }))
    );
  };

  const updateSet = (
    id: string,
    field: keyof SetRequestDto,
    value: number | boolean
  ) => {
    setSets((prev) =>
      prev.map((set) => (set.id === id ? { ...set, [field]: value } : set))
    );

    if (field === "completed" && value === true) {
      // Start rest timer
      if (onStartRestTimer) {
        const { minutes, seconds } = parseTime(restTime);
        const totalSeconds = minutes * 60 + seconds;
        if (totalSeconds > 0) {
          onStartRestTimer(totalSeconds, exercise.name);
        }
      }

      // Detect record (no modal, just mark the set)
      if (started && previousSessions.length > 0) {
        const completedSet = sets.find((s) => s.id === id);
        if (completedSet) {
          const record = detectRecord(
            exercise.id,
            exercise.name,
            completedSet,
            previousSessions
          );

          if (record) {
            setRecordSetTypes((prev) => ({ ...prev, [id]: record.type }));
            addRecord(record);
          }
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
          sets={sets}
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
