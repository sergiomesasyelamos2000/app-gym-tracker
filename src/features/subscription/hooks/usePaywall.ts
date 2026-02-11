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
        'Función Premium',
        message,
        [
          {
            text: 'Actualizar a Premium',
            onPress: () => {
              // Navigate to plans screen
              navigation.navigate('SubscriptionStack', {
                screen: 'PlansScreen',
              });
            },
            style: 'default',
          },
          {
            text: 'Quizás más tarde',
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
      return `Has alcanzado el límite de ${maxRoutines} rutinas en el plan gratuito. Actualiza a Premium para rutinas ilimitadas.`;
    case 'create_custom_product':
      return `Has alcanzado el límite de ${maxCustomProducts} productos personalizados en el plan gratuito. Actualiza a Premium para productos ilimitados.`;
    case 'create_custom_meal':
      return `Has alcanzado el límite de ${maxCustomMeals} comidas personalizadas en el plan gratuito. Actualiza a Premium para comidas ilimitadas.`;
    case 'ai_analysis':
      return 'El análisis de alimentos con IA es una función premium. Actualiza a Premium para analizar alimentos desde fotos.';
    case 'advanced_stats':
      return 'Las estadísticas avanzadas están disponibles con Premium. Actualiza para desbloquear información detallada.';
    case 'export_data':
      return 'La exportación de datos es una función premium. Actualiza para exportar tus datos de entrenamiento y nutrición.';
    default:
      return 'Esta función requiere una suscripción Premium. Actualiza para desbloquear todas las funciones.';
  }
}
