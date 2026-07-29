import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Check } from "lucide-react-native";
import type {
  PlanMetadata,
  SubscriptionPlan,
} from "@sergiomesasyelamos2000/shared";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import { withOpacity } from "../../../utils/themeStyles";

interface PlanCardProps {
  plan: PlanMetadata;
  onSelect: (planId: SubscriptionPlan) => void;
  isCurrentPlan?: boolean;
  disabled?: boolean;
}

export function PlanCard({
  plan,
  onSelect,
  isCurrentPlan,
  disabled,
}: PlanCardProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const handlePress = () => {
    if (!disabled && !isCurrentPlan) {
      onSelect(plan.id);
    }
  };

  const isFree = plan.id === "free";

  return (
    <TouchableOpacity
      style={[
        styles.card,
        plan.isPopular && styles.popularCard,
        isCurrentPlan && styles.currentCard,
        disabled && styles.disabledCard,
      ]}
      onPress={handlePress}
      disabled={disabled || isCurrentPlan}
      activeOpacity={0.7}
    >
      {plan.isPopular && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Más Popular</Text>
        </View>
      )}

      <View style={styles.header}>
        <Text style={styles.planName}>{plan.name}</Text>
        <Text style={styles.description}>{plan.description}</Text>
      </View>

      <View style={styles.priceContainer}>
        <Text style={styles.price}>{plan.price.toFixed(2)}</Text>
        <Text style={styles.currency}>€</Text>
        {plan.interval && plan.interval !== "lifetime" && (
          <Text style={styles.interval}>
            /
            {plan.interval === "month"
              ? "mes"
              : plan.interval === "year"
                ? "año"
                : plan.interval}
          </Text>
        )}
        {plan.interval === "lifetime" && (
          <Text style={styles.interval}> pago único</Text>
        )}
      </View>

      {plan.savings && (
        <View style={styles.savingsContainer}>
          <Text style={styles.savings}>{plan.savings}</Text>
        </View>
      )}

      <View style={styles.features}>
        {plan.features.map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <Check size={16} color={theme.success} style={styles.checkIcon} />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          isFree && styles.buttonSecondary,
          (isCurrentPlan || disabled) && styles.buttonDisabled,
        ]}
        onPress={handlePress}
        disabled={disabled || isCurrentPlan}
      >
        <Text
          style={[
            styles.buttonText,
            isFree && styles.buttonTextSecondary,
            isCurrentPlan && styles.buttonTextDisabled,
          ]}
        >
          {isCurrentPlan
            ? "Plan Actual"
            : isFree
              ? "Continuar con Gratuito"
              : "Seleccionar Plan"}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 20,
      marginVertical: 8,
      marginHorizontal: 16,
      borderWidth: 2,
      borderColor: theme.border,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    popularCard: {
      borderColor: theme.primary,
      transform: [{ scale: 1.02 }],
    },
    currentCard: {
      borderColor: theme.success,
      backgroundColor: withOpacity(theme.success, 15),
    },
    disabledCard: {
      opacity: 0.6,
    },
    badge: {
      position: "absolute",
      top: -10,
      right: 20,
      backgroundColor: theme.primary,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
    },
    badgeText: {
      color: theme.onPrimary,
      fontSize: 12,
      fontWeight: "600",
    },
    header: {
      marginBottom: 16,
    },
    planName: {
      fontSize: 24,
      fontWeight: "700",
      color: theme.text,
      marginBottom: 4,
    },
    description: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    priceContainer: {
      flexDirection: "row",
      alignItems: "baseline",
      marginBottom: 8,
    },
    currency: {
      fontSize: 28,
      fontWeight: "600",
      color: theme.text,
      marginLeft: 4,
    },
    price: {
      fontSize: 48,
      fontWeight: "700",
      color: theme.text,
    },
    interval: {
      fontSize: 16,
      color: theme.textSecondary,
      marginLeft: 4,
    },
    savingsContainer: {
      marginBottom: 16,
    },
    savings: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.success,
    },
    features: {
      marginVertical: 20,
    },
    featureRow: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 6,
    },
    checkIcon: {
      marginRight: 8,
    },
    featureText: {
      fontSize: 14,
      color: theme.textSecondary,
      flex: 1,
    },
    button: {
      backgroundColor: theme.primary,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
    },
    buttonSecondary: {
      backgroundColor: theme.backgroundSecondary,
    },
    buttonDisabled: {
      backgroundColor: theme.border,
    },
    buttonText: {
      color: theme.onPrimary,
      fontSize: 16,
      fontWeight: "600",
    },
    buttonTextSecondary: {
      color: theme.text,
    },
    buttonTextDisabled: {
      color: theme.textTertiary,
    },
  });
