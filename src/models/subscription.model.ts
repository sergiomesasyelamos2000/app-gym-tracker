// Subscription enums
export enum SubscriptionPlan {
  FREE = 'free',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  LIFETIME = 'lifetime',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  EXPIRED = 'expired',
  PAST_DUE = 'past_due',
  INCOMPLETE = 'incomplete',
  TRIAL = 'trial',
}

// Subscription models
export interface Subscription {
  id: string;
  userId: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  trialEnd?: Date;
  price?: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionFeatures {
  maxRoutines: number | null; // null = unlimited
  maxCustomProducts: number | null;
  maxCustomMeals: number | null;
  aiAnalysisEnabled: boolean;
  advancedStatsEnabled: boolean;
  exportDataEnabled: boolean;
  prioritySupportEnabled: boolean;
}

export interface SubscriptionStatusResponse {
  subscription: Subscription;
  features: SubscriptionFeatures;
  isPremium: boolean;
  daysRemaining?: number; // undefined for free, null for lifetime
}

// Request DTOs
export interface CreateCheckoutSessionRequest {
  planId: SubscriptionPlan;
  successUrl?: string;
  cancelUrl?: string;
}

export interface VerifyPaymentRequest {
  sessionId: string;
}

export interface CancelSubscriptionRequest {
  cancelImmediately?: boolean;
  reason?: string;
}

// Response DTOs
export interface CheckoutSessionResponse {
  sessionId: string;
  checkoutUrl: string;
}

export interface CustomerPortalResponse {
  portalUrl: string;
}

// Plan metadata for UI
export interface PlanMetadata {
  id: SubscriptionPlan;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval?: 'month' | 'year' | 'lifetime';
  features: string[];
  isPopular?: boolean;
  savings?: string; // e.g., "Save 17%"
}

export const PLAN_METADATA: Record<SubscriptionPlan, PlanMetadata> = {
  [SubscriptionPlan.FREE]: {
    id: SubscriptionPlan.FREE,
    name: 'Free',
    description: 'Get started with basic features',
    price: 0,
    currency: 'usd',
    features: [
      'Up to 3 routines',
      'Up to 5 custom products',
      'Up to 3 custom meals',
      'Basic stats',
      'Community support',
    ],
  },
  [SubscriptionPlan.MONTHLY]: {
    id: SubscriptionPlan.MONTHLY,
    name: 'Premium Monthly',
    description: 'Full access with monthly billing',
    price: 9.99,
    currency: 'usd',
    interval: 'month',
    features: [
      'Unlimited routines',
      'Unlimited custom products & meals',
      'AI food analysis',
      'Advanced statistics',
      'Data export',
      'Priority support',
    ],
  },
  [SubscriptionPlan.YEARLY]: {
    id: SubscriptionPlan.YEARLY,
    name: 'Premium Yearly',
    description: 'Best value - save with annual billing',
    price: 99.99,
    currency: 'usd',
    interval: 'year',
    isPopular: true,
    savings: 'Save 17%',
    features: [
      'Unlimited routines',
      'Unlimited custom products & meals',
      'AI food analysis',
      'Advanced statistics',
      'Data export',
      'Priority support',
      '2 months free!',
    ],
  },
  [SubscriptionPlan.LIFETIME]: {
    id: SubscriptionPlan.LIFETIME,
    name: 'Lifetime Access',
    description: 'One-time payment, lifetime access',
    price: 199.99,
    currency: 'usd',
    interval: 'lifetime',
    features: [
      'Everything in Premium',
      'Lifetime access',
      'All future updates',
      'No recurring fees',
      'Best long-term value',
    ],
  },
};
