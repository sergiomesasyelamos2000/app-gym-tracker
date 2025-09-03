import React, { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { Button, Card } from "react-native-paper";
import uuid from "react-native-uuid";

import ExerciseHeader from "./ExerciseHeader";
import ExerciseNotes from "./ExerciseNotes";
import ExerciseRestTimer from "./ExerciseRestTimer";
import ExerciseSetList from "./ExerciseSetList";
import { parseTime } from "./helpers";
import { ExerciseRequestDto, SetRequestDto } from "../../../../models";

interface Props {
  exercise: ExerciseRequestDto;
  initialSets: SetRequestDto[];
  onChangeSets: (sets: SetRequestDto[]) => void;
  onChangeExercise: (exercise: ExerciseRequestDto) => void;
}

const ExerciseCard = ({
  exercise,
  initialSets,
  onChangeSets,
  onChangeExercise,
}: Props) => {
  const [sets, setSets] = useState<SetRequestDto[]>(initialSets);
  const [note, setNote] = useState(exercise.notes || "");
  const [restTime, setRestTime] = useState("00:00");

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
    const newSet: SetRequestDto = {
      id: uuid.v4() as string,
      order: sets.length + 1,
      weight: 0,
      reps: 0,
      completed: false,
    };
    setSets([...sets, newSet]);
  };

  const updateSet = (
    id: string,
    field: keyof SetRequestDto,
    value: number | boolean
  ) => {
    setSets((prev) =>
      prev.map((set) => (set.id === id ? { ...set, [field]: value } : set))
    );
  };

  const deleteSet = (id: string) => {
    setSets((prev) =>
      prev
        .filter((set) => set.id !== id)
        .map((s, i) => ({ ...s, order: i + 1 }))
    );
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
    <Card style={styles.card}>
      <ExerciseHeader exercise={exercise} />
      <ExerciseNotes value={note} onChange={setNote} />
      <ExerciseRestTimer restTime={restTime} setRestTime={setRestTime} />
      <ExerciseSetList
        sets={sets}
        onUpdate={updateSet}
        onDelete={deleteSet}
        weightUnit={exercise.weightUnit || "kg"}
        repsType={exercise.repsType || "reps"}
        onWeightUnitChange={handleWeightUnitChange}
        onRepsTypeChange={handleRepsTypeChange}
      />
      <Button mode="contained" onPress={addSet} style={styles.addButton}>
        + Añadir Serie
      </Button>
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
