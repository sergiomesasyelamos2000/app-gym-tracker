import { apiFetch } from '../../../api/client';
import type {
  Subscription,
  SubscriptionStatusResponse,
  CreateCheckoutSessionRequest,
  CheckoutSessionResponse,
  CancelSubscriptionRequest,
  CustomerPortalResponse,
  SubscriptionPlan,
} from '@sergiomesasyelamos2000/shared';

/**
 * Get current user subscription status
 */
export async function getMySubscription(): Promise<SubscriptionStatusResponse> {
  return await apiFetch<SubscriptionStatusResponse>('subscription/me', {
    method: 'GET',
  });
}

/**
 * Create a Lemon Squeezy checkout session
 */
export async function createCheckoutSession(
  planId: SubscriptionPlan,
  successUrl?: string,
  cancelUrl?: string
): Promise<CheckoutSessionResponse> {
  const dto: CreateCheckoutSessionRequest = {
    planId,
    successUrl,
    cancelUrl,
  };

  return await apiFetch<CheckoutSessionResponse>('subscription/checkout', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

/**
 * Verify payment after checkout
 */
export async function verifyPayment(
  verificationId: string,
  planId?: SubscriptionPlan
): Promise<Subscription> {
  const dto = {
    sessionId: verificationId,
    ...(planId ? { planId } : {}),
  };

  return await apiFetch<Subscription>('subscription/verify-payment', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  cancelImmediately: boolean = false,
  reason?: string
): Promise<Subscription> {
  const dto: CancelSubscriptionRequest = {
    cancelImmediately,
    reason,
  };

  return await apiFetch<Subscription>('subscription/cancel', {
    method: 'PUT',
    body: JSON.stringify(dto),
  });
}

/**
 * Reactivate a canceled subscription
 */
export async function reactivateSubscription(): Promise<Subscription> {
  return await apiFetch<Subscription>('subscription/reactivate', {
    method: 'PUT',
  });
}

/**
 * Get Lemon Squeezy Customer Portal URL
 */
export async function getCustomerPortalUrl(): Promise<CustomerPortalResponse> {
  return await apiFetch<CustomerPortalResponse>('subscription/customer-portal', {
    method: 'GET',
  });
}
