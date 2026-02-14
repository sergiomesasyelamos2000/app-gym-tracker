import { create } from "zustand";
import { ExerciseRequestDto } from "../models";

export type ExerciseSelectionMode = "createRoutine" | "replaceExercise" | "addToRoutine";

interface ExerciseSelectionContext {
  mode: ExerciseSelectionMode;
  routineId?: string;
  replaceExerciseId?: string;
  singleSelection?: boolean;
}

interface ExerciseSelectionState {
  pendingCreatedExercise?: ExerciseRequestDto;
  setPendingCreatedExercise: (exercise: ExerciseRequestDto) => void;
  consumePendingCreatedExercise: () => ExerciseRequestDto | undefined;
  selectionContext?: ExerciseSelectionContext;
  setSelectionContext: (context: ExerciseSelectionContext) => void;
  clearSelectionContext: () => void;
}

export const useExerciseSelectionStore = create<ExerciseSelectionState>(
  (set, get) => ({
    pendingCreatedExercise: undefined,
    setPendingCreatedExercise: (exercise) =>
      set({ pendingCreatedExercise: exercise }),
    consumePendingCreatedExercise: () => {
      const exercise = get().pendingCreatedExercise;
      if (exercise) set({ pendingCreatedExercise: undefined });
      return exercise;
    },
    selectionContext: undefined,
    setSelectionContext: (context) => set({ selectionContext: context }),
    clearSelectionContext: () => set({ selectionContext: undefined }),
  })
);
