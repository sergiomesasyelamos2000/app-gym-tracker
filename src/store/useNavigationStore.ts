import { create } from "zustand";

interface NavigationState {
  hiddenTabs: Record<string, boolean>; // { "Macros": true, "Inicio": false, ... }
  setTabVisibility: (tabName: string, isVisible: boolean) => void;
  resetAllTabs: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  hiddenTabs: {},

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
}));
