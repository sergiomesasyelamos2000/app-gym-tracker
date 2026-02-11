// Subscription enums
export enum SubscriptionPlan {
  FREE = "free",
  MONTHLY = "monthly",
  YEARLY = "yearly",
  LIFETIME = "lifetime",
}

export enum SubscriptionStatus {
  ACTIVE = "active",
  CANCELED = "canceled",
  EXPIRED = "expired",
  PAST_DUE = "past_due",
  INCOMPLETE = "incomplete",
  TRIAL = "trial",
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
  interval?: "month" | "year" | "lifetime";
  features: string[];
  isPopular?: boolean;
  savings?: string; // e.g., "Save 17%"
}

export const PLAN_METADATA: Record<SubscriptionPlan, PlanMetadata> = {
  [SubscriptionPlan.FREE]: {
    id: SubscriptionPlan.FREE,
    name: "Gratuito",
    description: "Comienza con funciones básicas",
    price: 0,
    currency: "eur",
    features: [
      "Hasta 3 rutinas",
      "Hasta 5 productos personalizados",
      "Hasta 3 comidas personalizadas",
      "Estadísticas básicas",
      "Soporte comunitario",
    ],
  },
  [SubscriptionPlan.MONTHLY]: {
    id: SubscriptionPlan.MONTHLY,
    name: "Premium Mensual",
    description: "Acceso completo con facturación mensual",
    price: 0.99,
    currency: "eur",
    interval: "month",
    features: [
      "Rutinas ilimitadas",
      "Productos y comidas personalizadas ilimitadas",
      "Análisis de alimentos con IA",
      "Estadísticas avanzadas",
      "Exportación de datos",
      "Soporte prioritario",
    ],
  },
  [SubscriptionPlan.YEARLY]: {
    id: SubscriptionPlan.YEARLY,
    name: "Premium Anual",
    description: "Mejor precio - ahorra con facturación anual",
    price: 9.99,
    currency: "eur",
    interval: "year",
    isPopular: true,
    savings: "Ahorra 17%",
    features: [
      "Rutinas ilimitadas",
      "Productos y comidas personalizadas ilimitadas",
      "Análisis de alimentos con IA",
      "Estadísticas avanzadas",
      "Exportación de datos",
      "Soporte prioritario",
      "¡2 meses gratis!",
    ],
  },
  [SubscriptionPlan.LIFETIME]: {
    id: SubscriptionPlan.LIFETIME,
    name: "Acceso de por Vida",
    description: "Pago único, acceso para siempre",
    price: 19.99,
    currency: "eur",
    interval: "lifetime",
    features: [
      "Todo lo incluido en Premium",
      "Acceso de por vida",
      "Todas las actualizaciones futuras",
      "Sin pagos recurrentes",
      "Mejor valor a largo plazo",
    ],
  },
};
