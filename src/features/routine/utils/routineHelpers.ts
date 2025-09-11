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

export function calculateVolume(sets: SetRequestDto[]): number {
  return sets.reduce((acc, s) => {
    const weight = Number(s.weight) || 0;
    const reps = Number(s.reps) || 0;
    return acc + weight * reps;
  }, 0);
}

export const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};
