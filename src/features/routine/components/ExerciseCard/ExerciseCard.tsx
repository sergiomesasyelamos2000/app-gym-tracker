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
  compact?: boolean;
  onLongPress?: () => void; // 🔥 ÚNICO manejador de long press
  isDragging?: boolean;
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

  useEffect(() => {
    onChangeSets?.(sets);
  }, [sets]);

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

  // 🔥 CAMBIO: Eliminamos la lógica de reorderMode compacto
  // El modo compacto ahora se maneja completamente en RoutineEditScreen

  // Renderizado normal completo
  return (
    <Card style={styles.card}>
      {/* 🔥 CAMBIO: TouchableOpacity alrededor de toda la card */}
      <TouchableOpacity
        onLongPress={onLongPress}
        delayLongPress={500}
        activeOpacity={0.9}
      >
        <ExerciseHeader exercise={exercise} readonly={readonly} />
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
      </TouchableOpacity>
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
});

export default ExerciseCard;
