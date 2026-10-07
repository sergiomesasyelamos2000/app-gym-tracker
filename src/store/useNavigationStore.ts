import { create } from "zustand";

interface NavigationState {
  hiddenTabs: Record<string, boolean>; // { "Macros": true, "Inicio": false, ... }
  /** First Home paint completed for this process/login epoch. Not persisted. */
  homeReady: boolean;
  /** Bumped on logout so a late Home finally cannot unlock the next session. */
  homeGateEpoch: number;
  setTabVisibility: (tabName: string, isVisible: boolean) => void;
  resetAllTabs: () => void;
  markHomeReady: (epoch: number) => void;
  resetHomeGate: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  hiddenTabs: {},
  homeReady: false,
  homeGateEpoch: 0,

  setTabVisibility: (tabName: string, isVisible: boolean) => {
    set((state) => ({
      hiddenTabs: {
        ...state.hiddenTabs,
        [tabName]: !isVisible, // Guardamos si está oculta (true) o visible (false)
      },
    }));
  },

  resetAllTabs: () => {
    set({ hiddenTabs: {} });
  },

  markHomeReady: (epoch: number) => {
    set((state) => {
      if (epoch !== state.homeGateEpoch) {
        return state;
      }
      return { homeReady: true };
    });
  },

  resetHomeGate: () => {
    set((state) => ({
      homeReady: false,
      homeGateEpoch: state.homeGateEpoch + 1,
    }));
  },
}));
