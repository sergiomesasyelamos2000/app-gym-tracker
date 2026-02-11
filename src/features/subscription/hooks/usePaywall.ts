import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSubscriptionStore } from '../../../store/useSubscriptionStore';
import { Alert } from 'react-native';

export function usePaywall() {
  const navigation = useNavigation<any>();
  const { canAccessFeature, isPremium, features } = useSubscriptionStore();

  /**
   * Checks if user can access a feature and shows paywall if not
   * @param feature The feature to check
   * @param customMessage Optional custom message for the paywall
   * @returns true if user has access, false otherwise
   */
  const checkAccess = useCallback(
    (feature: string, customMessage?: string): boolean => {
      const hasAccess = canAccessFeature(feature);

      if (!hasAccess) {
        showPaywall(feature, customMessage);
      }

      return hasAccess;
    },
    [canAccessFeature]
  );

  /**
   * Shows a paywall alert/modal for a specific feature
   * @param feature The feature that requires premium
   * @param customMessage Optional custom message
   */
  const showPaywall = useCallback(
    (feature: string, customMessage?: string) => {
      const message =
        customMessage ||
        getDefaultMessage(feature, features?.maxRoutines, features?.maxCustomProducts, features?.maxCustomMeals);

      Alert.alert(
        'Premium Feature',
        message,
        [
          {
            text: 'Upgrade to Premium',
            onPress: () => {
              // Navigate to plans screen
              navigation.navigate('SubscriptionStack', {
                screen: 'PlansScreen',
              });
            },
            style: 'default',
          },
          {
            text: 'Maybe Later',
            style: 'cancel',
          },
        ],
        { cancelable: true }
      );
    },
    [navigation, features]
  );

  return {
    checkAccess,
    showPaywall,
    isPremium,
  };
}

/**
 * Gets a default message for a feature
 */
function getDefaultMessage(
  feature: string,
  maxRoutines?: number | null,
  maxCustomProducts?: number | null,
  maxCustomMeals?: number | null
): string {
  switch (feature) {
    case 'create_routine':
      return `You've reached the limit of ${maxRoutines} routines on the free plan. Upgrade to Premium for unlimited routines.`;
    case 'create_custom_product':
      return `You've reached the limit of ${maxCustomProducts} custom products on the free plan. Upgrade to Premium for unlimited custom products.`;
    case 'create_custom_meal':
      return `You've reached the limit of ${maxCustomMeals} custom meals on the free plan. Upgrade to Premium for unlimited custom meals.`;
    case 'ai_analysis':
      return 'AI food analysis is a premium feature. Upgrade to Premium to analyze food from photos.';
    case 'advanced_stats':
      return 'Advanced statistics are available with Premium. Upgrade to unlock detailed insights.';
    case 'export_data':
      return 'Data export is a premium feature. Upgrade to export your workout and nutrition data.';
    default:
      return 'This feature requires a Premium subscription. Upgrade to unlock all features.';
  }
}
