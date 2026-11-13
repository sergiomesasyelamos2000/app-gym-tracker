import { SubscriptionPlan } from "@sergiomesasyelamos2000/shared";

/**
 * Default / non-iOS stub. Platform files override on ios/android/web:
 * - useAppleIapCheckout.ios.ts — real StoreKit via expo-iap
 * - useAppleIapCheckout.android.ts / .web.ts — Stripe path, no IAP init
 */
export function useAppleIapCheckout() {
  return {
    connected: false,
    loading: false,
    productsLoaded: false,
    subscriptions: [],
    products: [],
    purchasePlan: async (_plan: SubscriptionPlan) => {},
    restoreApplePurchases: async () => {},
    openAppleSubscriptionManagement: async () => {},
    hasConfiguration: false,
  };
}
