import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PlanCard } from '../components/PlanCard';
import { useSubscription } from '../hooks/useSubscription';
import {
  SubscriptionPlan,
  PLAN_METADATA,
} from '../../../models/subscription.model';
import { createCheckoutSession } from '../services/subscriptionService';

export function PlansScreen() {
  const navigation = useNavigation<any>();
  const { subscription, isPremium } = useSubscription();
  const [loading, setLoading] = useState(false);

  const handleSelectPlan = async (planId: SubscriptionPlan) => {
    if (planId === SubscriptionPlan.FREE) {
      // User wants to stay on free plan
      navigation.goBack();
      return;
    }

    try {
      setLoading(true);

      // Create checkout session
      const { sessionId, checkoutUrl } = await createCheckoutSession(planId);

      // Navigate to checkout screen
      navigation.navigate('CheckoutScreen', {
        sessionId,
        checkoutUrl,
        planId,
      });
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to create checkout session. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    PLAN_METADATA[SubscriptionPlan.FREE],
    PLAN_METADATA[SubscriptionPlan.MONTHLY],
    PLAN_METADATA[SubscriptionPlan.YEARLY],
    PLAN_METADATA[SubscriptionPlan.LIFETIME],
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Choose Your Plan</Text>
          <Text style={styles.subtitle}>
            Unlock all features with Premium and take your fitness to the next level
          </Text>
        </View>

        {/* Current Plan Info */}
        {subscription && (
          <View style={styles.currentPlanContainer}>
            <Text style={styles.currentPlanLabel}>Current Plan:</Text>
            <Text style={styles.currentPlanText}>
              {PLAN_METADATA[subscription.plan].name}
            </Text>
          </View>
        )}

        {/* Plan Cards */}
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            onSelect={handleSelectPlan}
            isCurrentPlan={subscription?.plan === plan.id}
            disabled={loading}
          />
        ))}

        {/* Loading Overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Creating checkout session...</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            All plans include a 7-day money-back guarantee
          </Text>
          <Text style={styles.footerSubtext}>
            Cancel anytime • Secure payment powered by Stripe
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
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
  },
  currentPlanContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginBottom: 8,
  },
  currentPlanLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 8,
  },
  currentPlanText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
});
