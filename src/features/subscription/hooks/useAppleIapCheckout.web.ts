import { SubscriptionPlan } from "@sergiomesasyelamos2000/shared";

/**
 * Web uses Stripe checkout instead of Apple IAP.
 * Platform-specific .ios/.android files leave Metro web without a resolver
 * unless this stub exists.
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
