import uuid from "react-native-uuid";
import type { SetRequestDto } from "@sergiomesasyelamos2000/shared";

const normalizeAndSortSets = (sets: SetRequestDto[]): SetRequestDto[] => {
  return [...sets]
    .map((set, index) => ({
      set,
      index,
      order:
        typeof set.order === "number" && Number.isFinite(set.order)
          ? set.order
          : Number.MAX_SAFE_INTEGER,
    }))
    .sort((a, b) => {
      if (a.order === b.order) return a.index - b.index;
      return a.order - b.order;
    })
    .map((entry) => entry.set);
};

export const initializeSets = (sets: SetRequestDto[] = []): SetRequestDto[] => {
  if (sets.length > 0) {
    const sortedSets = normalizeAndSortSets(sets);
    return sortedSets.map((set, index) => ({
      ...set,
      id:
        typeof set.id === "string" && set.id.trim().length > 0
          ? set.id
          : (uuid.v4() as string),
      order: index + 1,
      completed: false, // 🔄 Asegurar que no estén completadas
    }));
  }

  return [
    {
      id: uuid.v4() as string,
      order: 1,
      weight: 0,
      reps: 0,
      completed: false, // 🔄 Valor por defecto
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
