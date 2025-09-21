import { create } from "zustand";
import { ExerciseRequestDto, SetRequestDto } from "../models";
import { persist, createJSONStorage, StateStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface WorkoutInProgress {
  routineId: string;
  routineTitle: string;
  duration: number;
  volume: number;
  completedSets: number;
  exercises: ExerciseRequestDto[];
  sets: { [exerciseId: string]: SetRequestDto[] };
  startedAt: number;
}

type WorkoutInProgressUpdater =
  | WorkoutInProgress
  | ((prev: WorkoutInProgress | null) => WorkoutInProgress);

interface WorkoutInProgressState {
  workoutInProgress: WorkoutInProgress | null;
  setWorkoutInProgress: (progress: WorkoutInProgressUpdater) => void;
  patchWorkoutInProgress: (partial: Partial<WorkoutInProgress>) => void;
  clearWorkoutInProgress: () => void;
  updateWorkoutProgress: (progress: Partial<WorkoutInProgress>) => void;
}

export const useWorkoutInProgressStore = create<WorkoutInProgressState>()(
  persist(
    (set, get) => ({
      workoutInProgress: null,

      setWorkoutInProgress: (progress) => {
        if (typeof progress === "function") {
          set((state) => ({
            workoutInProgress: progress(state.workoutInProgress),
          }));
        } else {
          set({ workoutInProgress: progress });
        }
      },

      patchWorkoutInProgress: (partial) =>
        set((state) => ({
          workoutInProgress: state.workoutInProgress
            ? { ...state.workoutInProgress, ...partial }
            : null,
        })),

      clearWorkoutInProgress: () => {
        // Limpiar estado en memoria
        set({ workoutInProgress: null });

        // Limpiar almacenamiento persistente directamente
        AsyncStorage.removeItem("workout-in-progress-storage");
      },

      updateWorkoutProgress: (progress) =>
        set((state) => ({
          workoutInProgress: state.workoutInProgress
            ? { ...state.workoutInProgress, ...progress }
            : null,
        })),
    }),
    {
      name: "workout-in-progress-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Asegurar que solo se persistan los datos, no las funciones
      partialize: (state) => ({
        workoutInProgress: state.workoutInProgress,
      }),
    }
  )
);
