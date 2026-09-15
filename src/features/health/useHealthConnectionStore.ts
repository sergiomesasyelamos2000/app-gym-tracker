import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  getHealthAuthorizationStatus,
  requestHealthAuthorization,
} from "./healthClient";
import type { HealthAuthorizationStatus } from "./types";

type HealthConnectionState = {
  status: HealthAuthorizationStatus;
  lastCheckedAt: number | null;
  /** After saving a workout, also write it to Apple Salud / Health Connect. */
  writeWorkoutsToHub: boolean;
  /** Show sleep/steps rest hint on Profile when available. */
  showRestHints: boolean;
  /** ISO timestamp of last dismissed TDEE suggestion (avoid nagging). */
  lastDismissedSuggestionAt: string | null;
  refreshStatus: () => Promise<HealthAuthorizationStatus>;
  connect: () => Promise<HealthAuthorizationStatus>;
  setWriteWorkoutsToHub: (value: boolean) => void;
  setShowRestHints: (value: boolean) => void;
  dismissSuggestion: () => void;
};

export const useHealthConnectionStore = create<HealthConnectionState>()(
  persist(
    (set) => ({
      status: "undetermined",
      lastCheckedAt: null,
      writeWorkoutsToHub: true,
      showRestHints: true,
      lastDismissedSuggestionAt: null,
      refreshStatus: async () => {
        const status = await getHealthAuthorizationStatus();
        set({ status, lastCheckedAt: Date.now() });
        return status;
      },
      connect: async () => {
        const status = await requestHealthAuthorization();
        set({ status, lastCheckedAt: Date.now() });
        return status;
      },
      setWriteWorkoutsToHub: (value) => set({ writeWorkoutsToHub: value }),
      setShowRestHints: (value) => set({ showRestHints: value }),
      dismissSuggestion: () =>
        set({ lastDismissedSuggestionAt: new Date().toISOString() }),
    }),
    {
      name: "health-connection",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        status: state.status,
        lastCheckedAt: state.lastCheckedAt,
        writeWorkoutsToHub: state.writeWorkoutsToHub,
        showRestHints: state.showRestHints,
        lastDismissedSuggestionAt: state.lastDismissedSuggestionAt,
      }),
    }
  )
);
