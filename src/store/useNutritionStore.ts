import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { FoodEntry } from "../models/nutrition.model";
import { UserNutritionProfileResponseDto } from "../models/user-nutrition-profile.model";

interface NutritionState {
  // State
  userProfile: UserNutritionProfileResponseDto | null;
  todayEntries: FoodEntry[];
  hasProfile: boolean;

  // Actions - Profile
  setUserProfile: (profile: UserNutritionProfileResponseDto | null) => void;
  setHasProfile: (hasProfile: boolean) => void;
  isProfileComplete: () => boolean;

  // Actions - Entries
  setTodayEntries: (entries: FoodEntry[]) => void;
  addFoodEntry: (entry: FoodEntry) => void;
  updateFoodEntry: (entryId: string, entry: Partial<FoodEntry>) => void;
  removeFoodEntry: (entryId: string) => void;

  // Actions - Clear
  clearNutritionData: () => void;
}

export const useNutritionStore = create<NutritionState>()(
  persist(
    (set, get) => ({
      // ========== STATE ==========
      userProfile: null,
      todayEntries: [],
      hasProfile: false,

      // ========== PROFILE ACTIONS ==========
      setUserProfile: (profile) =>
        set({
          userProfile: profile,
          hasProfile: !!profile,
        }),

      setHasProfile: (hasProfile) => set({ hasProfile }),

      isProfileComplete: () => {
        const { userProfile } = get();
        return !!userProfile;
      },

      // ========== ENTRIES ACTIONS ==========
      setTodayEntries: (entries) => set({ todayEntries: entries }),

      addFoodEntry: (entry) =>
        set((state) => ({
          todayEntries: [...state.todayEntries, entry],
        })),

      updateFoodEntry: (entryId, updatedEntry) =>
        set((state) => ({
          todayEntries: state.todayEntries.map((entry) =>
            entry.id === entryId ? { ...entry, ...updatedEntry } : entry
          ),
        })),

      removeFoodEntry: (entryId) =>
        set((state) => ({
          todayEntries: state.todayEntries.filter(
            (entry) => entry.id !== entryId
          ),
        })),

      // ========== CLEAR ACTIONS ==========
      clearNutritionData: () =>
        set({
          userProfile: null,
          todayEntries: [],
          hasProfile: false,
        }),
    }),
    {
      name: "nutrition-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Opcional: Solo persistir userProfile, no las entries del día
      partialize: (state) => ({
        userProfile: state.userProfile,
        hasProfile: state.hasProfile,
      }),
    }
  )
);
