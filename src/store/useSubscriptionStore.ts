import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { SubscriptionPlan } from '@sergiomesasyelamos2000/shared';
import type { Subscription, SubscriptionFeatures, SubscriptionStatusResponse } from '@sergiomesasyelamos2000/shared';

interface SubscriptionState {
  // State
  subscription: Subscription | null;
  features: SubscriptionFeatures | null;
  isPremium: boolean;
  isLoading: boolean;
  lastFetched: number | null;

  // Actions
  setSubscription: (data: SubscriptionStatusResponse) => void;
  updateSubscription: (subscription: Subscription) => void;
  updateFeatures: (features: SubscriptionFeatures) => void;
  setLoading: (isLoading: boolean) => void;
  clearSubscription: () => void;

  // Computed selectors
  canAccessFeature: (feature: string) => boolean;
  needsRefresh: () => boolean;
  getDaysRemaining: () => number | undefined;
  isExpired: () => boolean;
  isCanceled: () => boolean;
}

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      // ========== STATE ==========
      subscription: null,
      features: null,
      isPremium: false,
      isLoading: false,
      lastFetched: null,

      // ========== ACTIONS ==========
      setSubscription: (data) =>
        set({
          subscription: data.subscription,
          features: data.features,
          isPremium: data.isPremium,
          lastFetched: Date.now(),
        }),

      updateSubscription: (subscription) =>
        set({
          subscription,
          isPremium: [
            SubscriptionPlan.MONTHLY,
            SubscriptionPlan.YEARLY,
            SubscriptionPlan.LIFETIME,
          ].includes(subscription.plan),
        }),

      updateFeatures: (features) => set({ features }),

      setLoading: (isLoading) => set({ isLoading }),

      clearSubscription: () =>
        set({
          subscription: null,
          features: null,
          isPremium: false,
          lastFetched: null,
        }),

      // ========== COMPUTED SELECTORS ==========
      canAccessFeature: (feature: string) => {
        const { subscription, features, isPremium } = get();

        if (!subscription || !features) {
          return false;
        }

        // Premium users have access to all features
        if (isPremium) {
          return true;
        }

        // Free users have limited access
        switch (feature) {
          case 'create_routine':
            return features.maxRoutines === null || features.maxRoutines > 0;
          case 'create_custom_product':
            return features.maxCustomProducts === null || features.maxCustomProducts > 0;
          case 'create_custom_meal':
            return features.maxCustomMeals === null || features.maxCustomMeals > 0;
          case 'ai_analysis':
            return features.aiAnalysisEnabled;
          case 'advanced_stats':
            return features.advancedStatsEnabled;
          case 'export_data':
            return features.exportDataEnabled;
          default:
            return false;
        }
      },

      needsRefresh: () => {
        const { lastFetched } = get();
        if (!lastFetched) return true;
        return Date.now() - lastFetched > CACHE_DURATION;
      },

      getDaysRemaining: () => {
        const { subscription } = get();
        if (
          !subscription ||
          !subscription.currentPeriodEnd ||
          subscription.plan === SubscriptionPlan.LIFETIME
        ) {
          return undefined;
        }

        const now = new Date();
        const endDate = new Date(subscription.currentPeriodEnd);
        const daysRemaining = Math.ceil(
          (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        return daysRemaining > 0 ? daysRemaining : 0;
      },

      isExpired: () => {
        const { subscription } = get();
        if (!subscription) return false;

        if (subscription.plan === SubscriptionPlan.FREE) return false;
        if (subscription.plan === SubscriptionPlan.LIFETIME) return false;

        if (!subscription.currentPeriodEnd) return false;

        const now = new Date();
        const endDate = new Date(subscription.currentPeriodEnd);

        return now > endDate;
      },

      isCanceled: () => {
        const { subscription } = get();
        return subscription?.cancelAtPeriodEnd ?? false;
      },
    }),
    {
      name: 'subscription-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        subscription: state.subscription,
        features: state.features,
        isPremium: state.isPremium,
        lastFetched: state.lastFetched,
      }),
    }
  )
);

// Selectors for convenience
export const selectSubscription = (state: SubscriptionState) => state.subscription;
export const selectFeatures = (state: SubscriptionState) => state.features;
export const selectIsPremium = (state: SubscriptionState) => state.isPremium;
export const selectIsLoading = (state: SubscriptionState) => state.isLoading;
export const selectCanAccessFeature = (feature: string) => (state: SubscriptionState) =>
  state.canAccessFeature(feature);
