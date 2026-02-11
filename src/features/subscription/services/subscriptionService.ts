import { apiFetch } from '../../../api/client';
import {
  Subscription,
  SubscriptionStatusResponse,
  CreateCheckoutSessionRequest,
  CheckoutSessionResponse,
  VerifyPaymentRequest,
  CancelSubscriptionRequest,
  CustomerPortalResponse,
  SubscriptionPlan,
} from '../../../models/subscription.model';

/**
 * Get current user subscription status
 */
export async function getMySubscription(): Promise<SubscriptionStatusResponse> {
  return await apiFetch<SubscriptionStatusResponse>('subscription/me', {
    method: 'GET',
  });
}

/**
 * Create a Stripe checkout session
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
export async function verifyPayment(sessionId: string): Promise<Subscription> {
  const dto: VerifyPaymentRequest = {
    sessionId,
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
 * Get Stripe Customer Portal URL
 */
export async function getCustomerPortalUrl(): Promise<CustomerPortalResponse> {
  return await apiFetch<CustomerPortalResponse>('subscription/customer-portal', {
    method: 'GET',
  });
}
