import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { PlanMetadata, SubscriptionPlan } from '../../../models/subscription.model';
import { useTheme } from '../../../contexts/ThemeContext';

interface PlanCardProps {
  plan: PlanMetadata;
  onSelect: (planId: SubscriptionPlan) => void;
  isCurrentPlan?: boolean;
  disabled?: boolean;
}

export function PlanCard({ plan, onSelect, isCurrentPlan, disabled }: PlanCardProps) {
  const { theme, isDark } = useTheme();

  const handlePress = () => {
    if (!disabled && !isCurrentPlan) {
      onSelect(plan.id);
    }
  };

  const isFree = plan.id === SubscriptionPlan.FREE;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border, shadowColor: theme.shadowColor },
        plan.isPopular && styles.popularCard,
        plan.isPopular && { borderColor: theme.primary },
        isCurrentPlan && styles.currentCard,
        isCurrentPlan && {
          borderColor: theme.success,
          backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#f0fdf4',
        },
        disabled && styles.disabledCard,
      ]}
      onPress={handlePress}
      disabled={disabled || isCurrentPlan}
      activeOpacity={0.7}
    >
      {/* Popular badge */}
      {plan.isPopular && (
        <View style={[styles.badge, { backgroundColor: theme.primary }]}>
          <Text style={styles.badgeText}>Más Popular</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.planName, { color: theme.text }]}>{plan.name}</Text>
        <Text style={[styles.description, { color: theme.textSecondary }]}>{plan.description}</Text>
      </View>

      {/* Price */}
      <View style={styles.priceContainer}>
        <Text style={[styles.price, { color: theme.text }]}>{plan.price.toFixed(2)}</Text>
        <Text style={[styles.currency, { color: theme.text }]}>€</Text>
        {plan.interval && plan.interval !== 'lifetime' && (
          <Text style={[styles.interval, { color: theme.textSecondary }]}>
            /{plan.interval === 'month' ? 'mes' : plan.interval === 'year' ? 'año' : plan.interval}
          </Text>
        )}
        {plan.interval === 'lifetime' && (
          <Text style={[styles.interval, { color: theme.textSecondary }]}> pago único</Text>
        )}
      </View>

      {/* Savings */}
      {plan.savings && (
        <View style={styles.savingsContainer}>
          <Text style={[styles.savings, { color: theme.success }]}>{plan.savings}</Text>
        </View>
      )}

      {/* Features */}
      <View style={styles.features}>
        {plan.features.map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <Check size={16} color={theme.success} style={styles.checkIcon} />
            <Text style={[styles.featureText, { color: theme.textSecondary }]}>{feature}</Text>
          </View>
        ))}
      </View>

      {/* Button */}
      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: theme.primary },
          isFree && styles.buttonSecondary,
          isFree && { backgroundColor: theme.backgroundSecondary },
          isCurrentPlan && styles.buttonDisabled,
          isCurrentPlan && { backgroundColor: theme.border },
          disabled && styles.buttonDisabled,
          disabled && { backgroundColor: theme.border },
        ]}
        onPress={handlePress}
        disabled={disabled || isCurrentPlan}
      >
        <Text
          style={[
            styles.buttonText,
            { color: '#ffffff' },
            isFree && styles.buttonTextSecondary,
            isFree && { color: theme.text },
            isCurrentPlan && styles.buttonTextDisabled,
            isCurrentPlan && { color: theme.textTertiary },
          ]}
        >
          {isCurrentPlan ? 'Plan Actual' : isFree ? 'Continuar con Gratuito' : 'Seleccionar Plan'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  popularCard: {
    borderColor: '#3b82f6',
    transform: [{ scale: 1.02 }],
  },
  currentCard: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  disabledCard: {
    opacity: 0.6,
  },
  badge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  header: {
    marginBottom: 16,
  },
  planName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  currency: {
    fontSize: 28,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 4,
  },
  price: {
    fontSize: 48,
    fontWeight: '700',
    color: '#111827',
  },
  interval: {
    fontSize: 16,
    color: '#6b7280',
    marginLeft: 4,
  },
  savingsContainer: {
    marginBottom: 16,
  },
  savings: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  features: {
    marginVertical: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  checkIcon: {
    marginRight: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: '#f3f4f6',
  },
  buttonDisabled: {
    backgroundColor: '#e5e7eb',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#374151',
  },
  buttonTextDisabled: {
    color: '#9ca3af',
  },
});
