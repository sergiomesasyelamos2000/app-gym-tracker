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
      'Premium Feature',
      `You've reached the limit of ${features.maxRoutines} routines on the free plan. Upgrade to Premium for unlimited routines.`,
      [
        {
          text: 'Upgrade to Premium',
          onPress: () => {
            navigation.navigate('SubscriptionStack', {
              screen: 'PlansScreen',
            });
          },
        },
        { text: 'Cancel', style: 'cancel' },
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
      'Premium Feature',
      `You've reached the limit of ${features.maxCustomProducts} custom products on the free plan. Upgrade to Premium for unlimited custom products.`,
      [
        {
          text: 'Upgrade to Premium',
          onPress: () => {
            navigation.navigate('SubscriptionStack', {
              screen: 'PlansScreen',
            });
          },
        },
        { text: 'Cancel', style: 'cancel' },
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
      'Premium Feature',
      `You've reached the limit of ${features.maxCustomMeals} custom meals on the free plan. Upgrade to Premium for unlimited custom meals.`,
      [
        {
          text: 'Upgrade to Premium',
          onPress: () => {
            navigation.navigate('SubscriptionStack', {
              screen: 'PlansScreen',
            });
          },
        },
        { text: 'Cancel', style: 'cancel' },
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
      'Premium Feature',
      'AI food analysis is a premium feature. Upgrade to Premium to analyze food from photos.',
      [
        {
          text: 'Upgrade to Premium',
          onPress: () => {
            navigation.navigate('SubscriptionStack', {
              screen: 'PlansScreen',
            });
          },
        },
        { text: 'Cancel', style: 'cancel' },
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
      'Premium Feature',
      'Advanced statistics are available with Premium. Upgrade to unlock detailed insights.',
      [
        {
          text: 'Upgrade to Premium',
          onPress: () => {
            navigation.navigate('SubscriptionStack', {
              screen: 'PlansScreen',
            });
          },
        },
        { text: 'Cancel', style: 'cancel' },
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
      'Premium Feature',
      'Data export is a premium feature. Upgrade to export your workout and nutrition data.',
      [
        {
          text: 'Upgrade to Premium',
          onPress: () => {
            navigation.navigate('SubscriptionStack', {
              screen: 'PlansScreen',
            });
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }

  return canExport;
}
