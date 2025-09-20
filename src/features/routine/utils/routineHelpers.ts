import uuid from "react-native-uuid";
import { SetRequestDto } from "../../../models";

export const initializeSets = (exerciseSets?: SetRequestDto[]) => {
  if (exerciseSets && exerciseSets.length > 0) {
    return exerciseSets.map((set) => ({
      ...set,
      completed: typeof set.completed === "boolean" ? set.completed : false,
    }));
  }

  return [
    {
      id: uuid.v4() as string,
      order: 1,
      weight: 0,
      reps: 0,
      completed: false,
    },
  ];
};

export const calculateVolume = (sets: SetRequestDto[]) => {
  return sets
    .filter((set) => set.completed) // Solo series completadas
    .reduce((total, set) => {
      const reps = set.reps || set.repsMin || 0;
      return total + (set.weight || 0) * reps;
    }, 0);
};

export const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};
