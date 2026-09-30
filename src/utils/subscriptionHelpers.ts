import { NavigationProp } from "@react-navigation/native";
import type { SubscriptionFeatures } from "@sergiomesasyelamos2000/shared";
import { Alert } from "react-native";
import { useSubscriptionStore } from "../store/useSubscriptionStore";
import { BaseNavigation } from "../types";

export type RoutineLimitState = {
  isPremium: boolean;
  features: SubscriptionFeatures | null;
};

/**
 * True when a non-premium user has reached the routine cap.
 * Fails open while features are unknown so the create action stays available.
 */
export function isAtRoutineLimitFromState(
  currentCount: number,
  state: RoutineLimitState
): boolean {
  if (state.isPremium) return false;
  if (!state.features) return false;
  if (state.features.maxRoutines === null) return false;
  return currentCount >= state.features.maxRoutines;
}

export function isAtRoutineLimit(currentCount: number): boolean {
  const { features, isPremium } = useSubscriptionStore.getState();
  return isAtRoutineLimitFromState(currentCount, { isPremium, features });
}

export function openPremiumPlans(navigation: NavigationProp<any>): void {
  navigation.navigate("SubscriptionStack", {
    screen: "PlansScreen",
  });
}

export function routineLimitMessage(maxRoutines: number): string {
  return `Has alcanzado el límite de ${maxRoutines} rutinas en el plan gratuito. Actualiza a Premium para rutinas ilimitadas.`;
}

/**
 * Check if user can create a new routine
 * @param currentCount Current number of routines
 * @param navigation Navigation object to show paywall
 * @returns true if user can create, false otherwise
 */
export function canCreateRoutine(
  currentCount: number,
  navigation?: NavigationProp<any>
): boolean {
  const { features, isPremium } = useSubscriptionStore.getState();

  if (!isAtRoutineLimitFromState(currentCount, { isPremium, features })) {
    return true;
  }

  if (navigation && features?.maxRoutines != null) {
    Alert.alert(
      "Función Premium",
      routineLimitMessage(features.maxRoutines),
      [
        {
          text: "Actualizar a Premium",
          onPress: () => {
            openPremiumPlans(navigation);
          },
        },
        { text: "Cancelar", style: "cancel" },
      ]
    );
  }

  return false;
}

/**
 * Check if user can create a custom product
 * @param currentCount Current number of custom products
 * @param navigation Navigation object to show paywall
 * @returns true if user can create, false otherwise
 */
export function canCreateCustomProduct(
  currentCount: number,
  navigation?: NavigationProp<any>
): boolean {
  const { features, isPremium } = useSubscriptionStore.getState();

  if (isPremium) return true;

  if (!features) return true;

  if (features.maxCustomProducts === null) {
    return true;
  }

  const canCreate = currentCount < features.maxCustomProducts;

  if (!canCreate && navigation) {
    Alert.alert(
      "Función Premium",
      `Has alcanzado el límite de ${features.maxCustomProducts} productos personalizados en el plan gratuito. Actualiza a Premium para productos ilimitados.`,
      [
        {
          text: "Actualizar a Premium",
          onPress: () => {
            navigation.navigate("SubscriptionStack", {
              screen: "PlansScreen",
            });
          },
        },
        { text: "Cancelar", style: "cancel" },
      ]
    );
  }

  return canCreate;
}

/**
 * Check if user can create a custom meal
 * @param currentCount Current number of custom meals
 * @param navigation Navigation object to show paywall
 * @returns true if user can create, false otherwise
 */
export function canCreateCustomMeal(
  currentCount: number,
  navigation?: NavigationProp<any>
): boolean {
  const { features, isPremium } = useSubscriptionStore.getState();

  if (isPremium) return true;

  if (!features) return true;

  if (features.maxCustomMeals === null) {
    return true;
  }

  const canCreate = currentCount < features.maxCustomMeals;

  if (!canCreate && navigation) {
    Alert.alert(
      "Función Premium",
      `Has alcanzado el límite de ${features.maxCustomMeals} comidas personalizadas en el plan gratuito. Actualiza a Premium para comidas ilimitadas.`,
      [
        {
          text: "Actualizar a Premium",
          onPress: () => {
            navigation.navigate("SubscriptionStack", {
              screen: "PlansScreen",
            });
          },
        },
        { text: "Cancelar", style: "cancel" },
      ]
    );
  }

  return canCreate;
}

/**
 * Check if user can use AI analysis
 * @param navigation Navigation object to show paywall
 * @returns true if user can use, false otherwise
 */
export function canUseAI(navigation?: BaseNavigation): boolean {
  const { features, isPremium } = useSubscriptionStore.getState();

  if (!features) return true;

  const canUse = features.aiAnalysisEnabled;

  if (!canUse && navigation) {
    Alert.alert(
      "Función Premium",
      "El análisis de alimentos con IA es una función premium. Actualiza a Premium para analizar alimentos desde fotos.",
      [
        {
          text: "Actualizar a Premium",
          onPress: () => {
            navigation.navigate("SubscriptionStack", {
              screen: "PlansScreen",
            });
          },
        },
        { text: "Cancelar", style: "cancel" },
      ]
    );
  }

  return canUse;
}

/**
 * Check if user can access advanced stats
 * @param navigation Navigation object to show paywall
 * @returns true if user can access, false otherwise
 */
export function canAccessAdvancedStats(navigation?: BaseNavigation): boolean {
  const { features, isPremium } = useSubscriptionStore.getState();

  if (!features) return true;

  const canAccess = features.advancedStatsEnabled;

  if (!canAccess && navigation) {
    Alert.alert(
      "Función Premium",
      "Las estadísticas avanzadas están disponibles con Premium. Actualiza para desbloquear información detallada.",
      [
        {
          text: "Actualizar a Premium",
          onPress: () => {
            navigation.navigate("SubscriptionStack", {
              screen: "PlansScreen",
            });
          },
        },
        { text: "Cancelar", style: "cancel" },
      ]
    );
  }

  return canAccess;
}

/**
 * Check if user can export data
 * @param navigation Navigation object to show paywall
 * @returns true if user can export, false otherwise
 */
export function canExportData(navigation?: BaseNavigation): boolean {
  const { features, isPremium } = useSubscriptionStore.getState();

  if (!features) return true;

  const canExport = features.exportDataEnabled;

  if (!canExport && navigation) {
    Alert.alert(
      "Función Premium",
      "La exportación de datos es una función premium. Actualiza para exportar tus datos de entrenamiento y nutrición.",
      [
        {
          text: "Actualizar a Premium",
          onPress: () => {
            navigation.navigate("SubscriptionStack", {
              screen: "PlansScreen",
            });
          },
        },
        { text: "Cancelar", style: "cancel" },
      ]
    );
  }

  return canExport;
}
