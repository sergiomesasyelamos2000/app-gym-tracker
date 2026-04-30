import {
  SubscriptionPlan,
  type SubscriptionStatusResponse,
} from "@sergiomesasyelamos2000/shared";
import { apiFetch } from "../../../api/client";
import { ENV } from "../../../environments/environment";

export interface VerifyApplePurchaseRequest {
  receiptData: string;
  productId?: string;
  transactionId?: string;
  purchaseToken?: string;
}

export const APPLE_IAP_PRODUCT_IDS: Partial<Record<SubscriptionPlan, string>> = {
  [SubscriptionPlan.MONTHLY]: ENV.APPLE_IAP_MONTHLY_PRODUCT_ID,
  [SubscriptionPlan.YEARLY]: ENV.APPLE_IAP_YEARLY_PRODUCT_ID,
  [SubscriptionPlan.LIFETIME]: ENV.APPLE_IAP_LIFETIME_PRODUCT_ID,
};

export const APPLE_IAP_SUBSCRIPTION_IDS = [
  APPLE_IAP_PRODUCT_IDS[SubscriptionPlan.MONTHLY],
  APPLE_IAP_PRODUCT_IDS[SubscriptionPlan.YEARLY],
].filter((value): value is string => Boolean(value));

export const APPLE_IAP_LIFETIME_IDS = [
  APPLE_IAP_PRODUCT_IDS[SubscriptionPlan.LIFETIME],
].filter((value): value is string => Boolean(value));

export function getPlanFromAppleProductId(
  productId?: string | null
): SubscriptionPlan | null {
  if (!productId) return null;

  const entry = Object.entries(APPLE_IAP_PRODUCT_IDS).find(
    ([, configuredProductId]) => configuredProductId === productId
  );

  return (entry?.[0] as SubscriptionPlan | undefined) || null;
}

export function hasAppleIapConfiguration(): boolean {
  return (
    APPLE_IAP_SUBSCRIPTION_IDS.length > 0 || APPLE_IAP_LIFETIME_IDS.length > 0
  );
}

export async function verifyApplePurchase(
  payload: VerifyApplePurchaseRequest
): Promise<SubscriptionStatusResponse> {
  return apiFetch<SubscriptionStatusResponse>("purchases/verify-apple", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
