import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  ExerciseRequestDto,
  SetRequestDto,
} from "@sergiomesasyelamos2000/shared";

export interface WorkoutInProgress {
  routineId: string;
  routineTitle: string;
  duration: number;
  volume: number;
  completedSets: number;
  exercises: ExerciseRequestDto[];
  sets: { [exerciseId: string]: SetRequestDto[] };
  startedAt: number;
  pausedAt?: number;
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

/** Max AsyncStorage write frequency for workout-in-progress (ms). */
const PERSIST_THROTTLE_MS = 10_000;

type PendingWrite = { name: string; value: string };

let pendingWrite: PendingWrite | null = null;
let throttleTimer: ReturnType<typeof setTimeout> | null = null;

const writePendingToStorage = async () => {
  if (!pendingWrite) return;
  const { name, value } = pendingWrite;
  pendingWrite = null;
  await AsyncStorage.setItem(name, value);
};

/**
 * Flushes any throttled workout persist write immediately.
 * Call on background, pause, finish, or other critical moments.
 */
export async function flushWorkoutInProgressPersist(): Promise<void> {
  if (throttleTimer) {
    clearTimeout(throttleTimer);
    throttleTimer = null;
  }
  await writePendingToStorage();
}

const throttledAsyncStorage = {
  getItem: (name: string) => AsyncStorage.getItem(name),
  setItem: (name: string, value: string) => {
    pendingWrite = { name, value };
    if (throttleTimer != null) return;
    throttleTimer = setTimeout(() => {
      throttleTimer = null;
      void writePendingToStorage();
    }, PERSIST_THROTTLE_MS);
  },
  removeItem: async (name: string) => {
    pendingWrite = null;
    if (throttleTimer) {
      clearTimeout(throttleTimer);
      throttleTimer = null;
    }
    await AsyncStorage.removeItem(name);
  },
};

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
        set({ workoutInProgress: null });
        void throttledAsyncStorage.removeItem("workout-in-progress-storage");
      },

      updateWorkoutProgress: (progress) => {
        get().patchWorkoutInProgress(progress);
      },
    }),
    {
      name: "workout-in-progress-storage",
      storage: createJSONStorage(() => throttledAsyncStorage),
      partialize: (state) => ({
        workoutInProgress: state.workoutInProgress,
      }),
    }
  )
);
