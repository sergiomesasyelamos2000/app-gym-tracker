import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Crown, Calendar, CreditCard, ArrowRight, CheckCircle } from 'lucide-react-native';
import { useSubscription } from '../hooks/useSubscription';
import { FeatureList } from '../components/FeatureList';
import { UpgradeButton } from '../components/UpgradeButton';
import {
  cancelSubscription,
  reactivateSubscription,
  getCustomerPortalUrl,
} from '../services/subscriptionService';
import {
  SubscriptionPlan,
  PLAN_METADATA,
} from '../../../models/subscription.model';

export function StatusScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { success } = (route.params as any) || {};

  const {
    subscription,
    features,
    isPremium,
    isLoading,
    getDaysRemaining,
    isCanceled,
    fetchSubscription,
  } = useSubscription();

  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    // Refresh subscription data when screen mounts
    fetchSubscription();
  }, []);

  const handleCancelSubscription = () => {
    Alert.alert(
      'Cancelar Suscripción',
      '¿Estás seguro de que quieres cancelar tu suscripción? Seguirás teniendo acceso hasta el final de tu período de facturación.',
      [
        { text: 'Mantener Suscripción', style: 'cancel' },
        {
          text: 'Cancelar Suscripción',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await cancelSubscription(false); // Cancel at period end
              await fetchSubscription();
              Alert.alert('Éxito', 'Tu suscripción se cancelará al final del período de facturación.');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'No se pudo cancelar la suscripción');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleReactivateSubscription = async () => {
    try {
      setActionLoading(true);
      await reactivateSubscription();
      await fetchSubscription();
      Alert.alert('Éxito', '¡Tu suscripción ha sido reactivada!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo reactivar la suscripción');
    } finally {
      setActionLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setActionLoading(true);
      const { portalUrl } = await getCustomerPortalUrl();
      await Linking.openURL(portalUrl);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo abrir el portal de cliente');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePlan = () => {
    navigation.navigate('PlansScreen');
  };

  if (isLoading || !subscription) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </SafeAreaView>
    );
  }

  const planMetadata = PLAN_METADATA[subscription.plan];
  const daysRemaining = getDaysRemaining;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Banner */}
        {success && (
          <View style={styles.successBanner}>
            <CheckCircle size={24} color="#10b981" />
            <Text style={styles.successText}>
              ¡Bienvenido a Premium! Tu suscripción está activa.
            </Text>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <Crown size={32} color={isPremium ? '#f59e0b' : '#9ca3af'} />
          <Text style={styles.title}>Mi Suscripción</Text>
        </View>

        {/* Current Plan Card */}
        <View style={[styles.card, isPremium && styles.premiumCard]}>
          <View style={styles.cardHeader}>
            <Text style={styles.planName}>{planMetadata.name}</Text>
            {isPremium && <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>Premium</Text>
            </View>}
          </View>

          <Text style={styles.planDescription}>{planMetadata.description}</Text>

          {/* Subscription Details */}
          {isPremium && (
            <View style={styles.detailsContainer}>
              {/* Price */}
              <View style={styles.detailRow}>
                <CreditCard size={20} color="#6b7280" />
                <Text style={styles.detailLabel}>Precio:</Text>
                <Text style={styles.detailValue}>
                  ${typeof subscription.price === 'number' ? subscription.price.toFixed(2) : '0.00'}/{planMetadata.interval === 'month' ? 'mes' : planMetadata.interval === 'year' ? 'año' : planMetadata.interval}
                </Text>
              </View>

              {/* Renewal Date */}
              {subscription.currentPeriodEnd && subscription.plan !== SubscriptionPlan.LIFETIME && (
                <View style={styles.detailRow}>
                  <Calendar size={20} color="#6b7280" />
                  <Text style={styles.detailLabel}>
                    {isCanceled ? 'Expira:' : 'Se renueva:'}
                  </Text>
                  <Text style={styles.detailValue}>
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString('es-ES')}
                    {daysRemaining !== undefined && ` (${daysRemaining} días)`}
                  </Text>
                </View>
              )}

              {/* Canceled Notice */}
              {isCanceled && (
                <View style={styles.canceledNotice}>
                  <Text style={styles.canceledText}>
                    Tu suscripción se cancelará al final del período de facturación.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Features List */}
          <View style={styles.featuresSection}>
            <Text style={styles.featuresTitle}>Funciones Incluidas:</Text>
            <FeatureList features={planMetadata.features} />
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            {!isPremium && (
              <UpgradeButton
                onPress={handleChangePlan}
                variant="primary"
                size="large"
                style={styles.actionButton}
              />
            )}

            {isPremium && !isCanceled && subscription.plan !== SubscriptionPlan.LIFETIME && (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.buttonSecondary]}
                  onPress={handleManageSubscription}
                  disabled={actionLoading}
                >
                  <Text style={styles.buttonTextSecondary}>Gestionar Suscripción</Text>
                  <ArrowRight size={20} color="#374151" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.buttonDanger]}
                  onPress={handleCancelSubscription}
                  disabled={actionLoading}
                >
                  <Text style={styles.buttonTextDanger}>Cancelar Suscripción</Text>
                </TouchableOpacity>
              </>
            )}

            {isPremium && isCanceled && (
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={handleReactivateSubscription}
                disabled={actionLoading}
              >
                <Text style={styles.buttonTextPrimary}>Reactivar Suscripción</Text>
              </TouchableOpacity>
            )}

            {isPremium && (
              <TouchableOpacity
                style={[styles.button, styles.buttonOutline]}
                onPress={handleChangePlan}
                disabled={actionLoading}
              >
                <Text style={styles.buttonTextOutline}>Ver Todos los Planes</Text>
              </TouchableOpacity>
            )}
          </View>

          {actionLoading && (
            <View style={styles.actionLoadingOverlay}>
              <ActivityIndicator size="small" color="#3b82f6" />
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            ¿Preguntas? Contáctanos en support@gymtracker.com
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  successText: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#065f46',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  title: {
    marginTop: 12,
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  premiumCard: {
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  planName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  premiumBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  premiumBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
  },
  planDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  detailsContainer: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6b7280',
    marginRight: 8,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  canceledNotice: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  canceledText: {
    fontSize: 13,
    color: '#991b1b',
  },
  featuresSection: {
    marginBottom: 20,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  actions: {
    gap: 12,
  },
  actionButton: {
    width: '100%',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonPrimary: {
    backgroundColor: '#3b82f6',
  },
  buttonSecondary: {
    backgroundColor: '#f3f4f6',
  },
  buttonDanger: {
    backgroundColor: '#fef2f2',
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  buttonTextPrimary: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  buttonTextDanger: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextOutline: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  actionLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
});
