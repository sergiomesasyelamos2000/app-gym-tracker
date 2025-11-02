import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  UserNutritionProfile,
  FoodEntry,
  DailyNutritionSummary,
  MacroGoals,
} from '../models/nutrition.model';

interface NutritionState {
  // User profile and goals
  userProfile: UserNutritionProfile | null;
  setUserProfile: (profile: UserNutritionProfile) => void;
  updateMacroGoals: (goals: MacroGoals) => void;
  clearUserProfile: () => void;

  // Daily food diary
  todayEntries: FoodEntry[];
  addFoodEntry: (entry: FoodEntry) => void;
  removeFoodEntry: (entryId: string) => void;
  updateFoodEntry: (entryId: string, updates: Partial<FoodEntry>) => void;
  setTodayEntries: (entries: FoodEntry[]) => void;
  clearTodayEntries: () => void;

  // Totals
  getTodayTotals: () => {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };

  // Helper to check if profile is complete
  isProfileComplete: () => boolean;
}

export const useNutritionStore = create<NutritionState>()(
  persist(
    (set, get) => ({
      // Initial state
      userProfile: null,
      todayEntries: [],

      // Profile actions
      setUserProfile: (profile) => set({ userProfile: profile }),

      updateMacroGoals: (goals) =>
        set((state) => ({
          userProfile: state.userProfile
            ? { ...state.userProfile, macroGoals: goals }
            : null,
        })),

      clearUserProfile: () => {
        set({ userProfile: null, todayEntries: [] });
        AsyncStorage.removeItem('nutrition-storage');
      },

      // Food diary actions
      addFoodEntry: (entry) =>
        set((state) => ({
          todayEntries: [...state.todayEntries, entry],
        })),

      removeFoodEntry: (entryId) =>
        set((state) => ({
          todayEntries: state.todayEntries.filter(
            (entry) => entry.id !== entryId
          ),
        })),

      updateFoodEntry: (entryId, updates) =>
        set((state) => ({
          todayEntries: state.todayEntries.map((entry) =>
            entry.id === entryId ? { ...entry, ...updates } : entry
          ),
        })),

      setTodayEntries: (entries) => set({ todayEntries: entries }),

      clearTodayEntries: () => set({ todayEntries: [] }),

      // Computed values
      getTodayTotals: () => {
        const entries = get().todayEntries;
        return entries.reduce(
          (totals, entry) => ({
            calories: totals.calories + entry.calories,
            protein: totals.protein + entry.protein,
            carbs: totals.carbs + entry.carbs,
            fat: totals.fat + entry.fat,
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );
      },

      isProfileComplete: () => {
        const profile = get().userProfile;
        return (
          profile !== null &&
          profile.anthropometrics !== undefined &&
          profile.goals !== undefined &&
          profile.macroGoals !== undefined
        );
      },
    }),
    {
      name: 'nutrition-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        userProfile: state.userProfile,
        todayEntries: state.todayEntries,
      }),
    }
  )
);
