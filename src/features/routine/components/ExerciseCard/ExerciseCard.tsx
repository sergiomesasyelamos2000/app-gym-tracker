import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { Button, Card } from "react-native-paper";
import uuid from "react-native-uuid";

import ExerciseHeader from "./ExerciseHeader";
import ExerciseNotes from "./ExerciseNotes";
import ExerciseRestTimer from "./ExerciseRestTimer";
import ExerciseSetList from "./ExerciseSetList";
import { parseTime, formatTime } from "./helpers";
import { ExerciseRequestDto, SetRequestDto } from "../../../../models";
import ExerciseRestPicker from "./ExerciseRestPicker";

interface Props {
  exercise: ExerciseRequestDto;
  initialSets: SetRequestDto[];
  onChangeSets: (sets: SetRequestDto[]) => void;
  onChangeExercise: (exercise: ExerciseRequestDto) => void;
  readonly?: boolean;
  started?: boolean;
  onStartRestTimer?: (restSeconds: number) => void;
  // Nuevas props para reordenamiento
  compact?: boolean;
  onLongPress?: () => void;
  isDragging?: boolean;
  reorderMode?: boolean;
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
  reorderMode = false,
}: Props) => {
  const [sets, setSets] = useState<SetRequestDto[]>(initialSets);
  const [note, setNote] = useState(exercise.notes || "");
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

  // sincroniza sets con parent
  useEffect(() => {
    onChangeSets?.(sets);
  }, [sets]);

  // sincroniza exercise con parent
  useEffect(() => {
    const { minutes, seconds } = parseTime(restTime);
    onChangeExercise?.({
      ...exercise,
      notes: note,
      restSeconds: (minutes * 60 + seconds).toString(),
    });
  }, [note, restTime]);

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

    if (field === "completed" && value === true && onStartRestTimer) {
      const { minutes, seconds } = parseTime(restTime);
      const totalSeconds = minutes * 60 + seconds;
      if (totalSeconds > 0) {
        onStartRestTimer(totalSeconds);
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

  // Renderizado compacto para modo reordenamiento
  if (compact) {
    return (
      <TouchableOpacity
        onLongPress={onLongPress}
        style={[styles.compactCard, isDragging && styles.compactCardDragging]}
        activeOpacity={0.7}
      >
        <View style={styles.compactContent}>
          <View style={styles.dragHandle}>
            <Text style={styles.dragHandleIcon}>☰</Text>
          </View>
          <View style={styles.compactInfo}>
            <Text style={styles.compactName} numberOfLines={1}>
              {exercise.name}
            </Text>
            <Text style={styles.compactSets}>{sets.length} series</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Renderizado normal completo
  return (
    <Card style={styles.card}>
      <ExerciseHeader
        exercise={exercise}
        readonly={readonly}
        onLongPress={onLongPress}
        isDragging={isDragging}
        reorderMode={reorderMode}
      />
      <ExerciseNotes value={note} onChange={setNote} readonly={readonly} />
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
      />
      {!readonly && (
        <Button mode="contained" onPress={addSet} style={styles.addButton}>
          + Añadir Serie
        </Button>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    marginVertical: 16,
    padding: 20,
    borderRadius: 20,
    elevation: 4,
  },
  addButton: {
    marginTop: 20,
    backgroundColor: "#6C63FF",
    borderRadius: 14,
    paddingVertical: 8,
  },
  // Estilos para modo compacto/reordenamiento
  compactCard: {
    backgroundColor: "#FFFFFF",
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    elevation: 2,
  },
  compactCardDragging: {
    borderColor: "#6366F1",
    backgroundColor: "#EEF2FF",
    elevation: 8,
    shadowColor: "#6366F1",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  compactContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  dragHandle: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  dragHandleIcon: {
    fontSize: 18,
    color: "#6B7280",
    fontWeight: "bold",
  },
  compactInfo: {
    flex: 1,
  },
  compactName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  compactSets: {
    fontSize: 13,
    color: "#6B7280",
  },
});

export default ExerciseCard;
