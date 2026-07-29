import { SubscriptionPlan } from "@sergiomesasyelamos2000/shared";

/**
 * Android uses Stripe checkout instead of Apple IAP.
 * This stub avoids initializing expo-iap on Android, which would show
 * misleading App Store connection errors.
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
