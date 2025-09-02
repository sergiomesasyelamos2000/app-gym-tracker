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

export const calculateVolume = (allSets: SetRequestDto[]) =>
  allSets.reduce(
    (sum, s) => (s.completed ? sum + (s.weight ?? 0) * (s.reps ?? 0) : sum),
    0
  );

export const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};
