import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  getHealthAuthorizationStatus,
  getHealthClient,
  requestHealthAuthorization,
} from "./healthClient";
import {
  canReadHealthHub,
  canWriteHealthHub,
} from "./healthPermissionGates";
import type { HealthAuthorizationStatus } from "./types";

type HealthConnectionState = {
  status: HealthAuthorizationStatus;
  lastCheckedAt: number | null;
  /**
   * True after the user taps connect. HealthKit often leaves read grants
   * opaque (`undetermined`); this avoids a false "tap to connect" subtitle.
   */
  hasRequestedAuthorization: boolean;
  /** After saving a workout, also write it to Apple Salud / Health Connect. */
  writeWorkoutsToHub: boolean;
  /** Show sleep/steps rest hint on Profile when available. */
  showRestHints: boolean;
  /** ISO timestamp of last dismissed TDEE suggestion (avoid nagging). */
  lastDismissedSuggestionAt: string | null;
  refreshStatus: () => Promise<HealthAuthorizationStatus>;
  /**
   * Ensure the native hub is available, then present the system permission
   * sheet. Sets `hasRequestedAuthorization` only when the request path runs
   * (not when the module is missing).
   */
  connect: () => Promise<HealthAuthorizationStatus>;
  setWriteWorkoutsToHub: (value: boolean) => void;
  setShowRestHints: (value: boolean) => void;
  dismissSuggestion: () => void;
  /** Rest / live metrics may query the hub. */
  canReadFromHub: () => boolean;
  /** Completed sessions may be mirrored to the hub. */
  canWriteToHub: () => boolean;
};

export const useHealthConnectionStore = create<HealthConnectionState>()(
  persist(
    (set) => ({
      status: "undetermined",
      lastCheckedAt: null,
      hasRequestedAuthorization: false,
      writeWorkoutsToHub: true,
      showRestHints: true,
      lastDismissedSuggestionAt: null,
      refreshStatus: async () => {
        const status = await getHealthAuthorizationStatus();
        set({ status, lastCheckedAt: Date.now() });
        return status;
      },
      connect: async () => {
        const available = await getHealthClient().isAvailable();
        if (!available) {
          set({ status: "unavailable", lastCheckedAt: Date.now() });
          return "unavailable";
        }
        const status = await requestHealthAuthorization();
        // Mark requested whenever the system sheet path ran (even if write
        // status stays undetermined/denied — reads can still work).
        set({
          hasRequestedAuthorization: status !== "unavailable",
          status,
          lastCheckedAt: Date.now(),
        });
        return status;
      },
      setWriteWorkoutsToHub: (value) => set({ writeWorkoutsToHub: value }),
      setShowRestHints: (value) => set({ showRestHints: value }),
      dismissSuggestion: () =>
        set({ lastDismissedSuggestionAt: new Date().toISOString() }),
      canReadFromHub: () => {
        const { status, hasRequestedAuthorization } = useHealthConnectionStore.getState();
        return canReadHealthHub({ status, hasRequestedAuthorization });
      },
      canWriteToHub: () => {
        const { status, hasRequestedAuthorization, writeWorkoutsToHub } =
          useHealthConnectionStore.getState();
        return canWriteHealthHub({
          status,
          hasRequestedAuthorization,
          writeWorkoutsToHub,
        });
      },
    }),
    {
      name: "health-connection",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        status: state.status,
        lastCheckedAt: state.lastCheckedAt,
        hasRequestedAuthorization: state.hasRequestedAuthorization,
        writeWorkoutsToHub: state.writeWorkoutsToHub,
        showRestHints: state.showRestHints,
        lastDismissedSuggestionAt: state.lastDismissedSuggestionAt,
      }),
    }
  )
);
