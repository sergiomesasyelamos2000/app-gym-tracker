import { useSubscriptionStore } from '../store/useSubscriptionStore';
import { Alert } from 'react-native';

/**
 * Check if user can create a new routine
 * @param currentCount Current number of routines
 * @param navigation Navigation object to show paywall
 * @returns true if user can create, false otherwise
 */
export function canCreateRoutine(
  currentCount: number,
  navigation?: any
): boolean {
  const { features, isPremium } = useSubscriptionStore.getState();

  if (!features) return true; // Allow if not loaded yet

  if (isPremium || features.maxRoutines === null) {
    return true; // Unlimited
  }

  const canCreate = currentCount < features.maxRoutines;

  if (!canCreate && navigation) {
    Alert.alert(
      'Función Premium',
      `Has alcanzado el límite de ${features.maxRoutines} rutinas en el plan gratuito. Actualiza a Premium para rutinas ilimitadas.`,
      [
        {
          text: 'Actualizar a Premium',
          onPress: () => {
            navigation.navigate('SubscriptionStack', {
              screen: 'PlansScreen',
            });
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  }

  return canCreate;
}

/**
 * Check if user can create a custom product
 * @param currentCount Current number of custom products
 * @param navigation Navigation object to show paywall
 * @returns true if user can create, false otherwise
 */
export function canCreateCustomProduct(
  currentCount: number,
  navigation?: any
): boolean {
  const { features, isPremium } = useSubscriptionStore.getState();

  if (!features) return true;

  if (isPremium || features.maxCustomProducts === null) {
    return true;
  }

  const canCreate = currentCount < features.maxCustomProducts;

  if (!canCreate && navigation) {
    Alert.alert(
      'Función Premium',
      `Has alcanzado el límite de ${features.maxCustomProducts} productos personalizados en el plan gratuito. Actualiza a Premium para productos ilimitados.`,
      [
        {
          text: 'Actualizar a Premium',
          onPress: () => {
            navigation.navigate('SubscriptionStack', {
              screen: 'PlansScreen',
            });
          },
        },
        { text: 'Cancelar', style: 'cancel' },
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
  navigation?: any
): boolean {
  const { features, isPremium } = useSubscriptionStore.getState();

  if (!features) return true;

  if (isPremium || features.maxCustomMeals === null) {
    return true;
  }

  const canCreate = currentCount < features.maxCustomMeals;

  if (!canCreate && navigation) {
    Alert.alert(
      'Función Premium',
      `Has alcanzado el límite de ${features.maxCustomMeals} comidas personalizadas en el plan gratuito. Actualiza a Premium para comidas ilimitadas.`,
      [
        {
          text: 'Actualizar a Premium',
          onPress: () => {
            navigation.navigate('SubscriptionStack', {
              screen: 'PlansScreen',
            });
          },
        },
        { text: 'Cancelar', style: 'cancel' },
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
export function canUseAI(navigation?: any): boolean {
  const { features, isPremium } = useSubscriptionStore.getState();

  if (!features) return true;

  const canUse = features.aiAnalysisEnabled;

  if (!canUse && navigation) {
    Alert.alert(
      'Función Premium',
      'El análisis de alimentos con IA es una función premium. Actualiza a Premium para analizar alimentos desde fotos.',
      [
        {
          text: 'Actualizar a Premium',
          onPress: () => {
            navigation.navigate('SubscriptionStack', {
              screen: 'PlansScreen',
            });
          },
        },
        { text: 'Cancelar', style: 'cancel' },
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
export function canAccessAdvancedStats(navigation?: any): boolean {
  const { features, isPremium } = useSubscriptionStore.getState();

  if (!features) return true;

  const canAccess = features.advancedStatsEnabled;

  if (!canAccess && navigation) {
    Alert.alert(
      'Función Premium',
      'Las estadísticas avanzadas están disponibles con Premium. Actualiza para desbloquear información detallada.',
      [
        {
          text: 'Actualizar a Premium',
          onPress: () => {
            navigation.navigate('SubscriptionStack', {
              screen: 'PlansScreen',
            });
          },
        },
        { text: 'Cancelar', style: 'cancel' },
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
export function canExportData(navigation?: any): boolean {
  const { features, isPremium } = useSubscriptionStore.getState();

  if (!features) return true;

  const canExport = features.exportDataEnabled;

  if (!canExport && navigation) {
    Alert.alert(
      'Función Premium',
      'La exportación de datos es una función premium. Actualiza para exportar tus datos de entrenamiento y nutrición.',
      [
        {
          text: 'Actualizar a Premium',
          onPress: () => {
            navigation.navigate('SubscriptionStack', {
              screen: 'PlansScreen',
            });
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  }

  return canExport;
}
