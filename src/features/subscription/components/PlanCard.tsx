import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Check } from "lucide-react-native";
import type {
  PlanMetadata,
  SubscriptionPlan,
} from "@sergiomesasyelamos2000/shared";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import { withOpacity } from "../../../utils/themeStyles";
import { useResponsive } from "../../../hooks/useResponsive";
import {
  SUBSCRIPTION_BADGE_CLEARANCE,
  SUBSCRIPTION_CARD_GAP,
  subscriptionTypeScale,
  type SubscriptionTypeScale,
} from "../subscriptionLayout";

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
  const { isSmallPhone } = useResponsive();
  const type = useMemo(
    () => subscriptionTypeScale(isSmallPhone),
    [isSmallPhone]
  );
  const styles = useMemo(
    () => createStyles(theme, type, isSmallPhone),
    [theme, type, isSmallPhone]
  );

  const handlePress = () => {
    if (!disabled && !isCurrentPlan) {
      onSelect(plan.id);
    }
  };

  const isFree = plan.id === "free";

  return (
    <View style={[styles.slot, plan.isPopular && styles.popularSlot]}>
      {plan.isPopular && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Más Popular</Text>
        </View>
      )}

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
        <View style={styles.header}>
          <Text style={styles.planName}>{plan.name}</Text>
          <Text style={styles.description}>{plan.description}</Text>
        </View>

        <View style={styles.priceContainer}>
          <Text
            style={styles.price}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {plan.price.toFixed(2)}
          </Text>
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
    </View>
  );
}

const createStyles = (
  theme: Theme,
  type: SubscriptionTypeScale,
  isSmallPhone: boolean
) =>
  StyleSheet.create({
    slot: {
      marginBottom: SUBSCRIPTION_CARD_GAP,
      position: "relative",
    },
    popularSlot: {
      marginTop: SUBSCRIPTION_BADGE_CLEARANCE,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: isSmallPhone ? 16 : 20,
      borderWidth: 0,
      borderColor: "transparent",
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
    },
    popularCard: {
      borderWidth: 2,
      borderColor: theme.primary,
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    currentCard: {
      borderWidth: 2,
      borderColor: theme.success,
      backgroundColor: withOpacity(theme.success, 15),
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    disabledCard: {
      opacity: 0.6,
    },
    badge: {
      position: "absolute",
      top: -12,
      right: 16,
      zIndex: 2,
      elevation: 6,
      backgroundColor: theme.primary,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
    },
    badgeText: {
      color: theme.onPrimary,
      fontSize: type.caption,
      fontWeight: "600",
    },
    header: {
      marginBottom: 16,
    },
    planName: {
      fontSize: type.title,
      fontWeight: "700",
      color: theme.text,
      marginBottom: 4,
    },
    description: {
      fontSize: type.feature,
      color: theme.textSecondary,
    },
    priceContainer: {
      flexDirection: "row",
      alignItems: "baseline",
      flexWrap: "wrap",
      marginBottom: 8,
    },
    currency: {
      fontSize: type.currency,
      fontWeight: "600",
      color: theme.text,
      marginLeft: 4,
    },
    price: {
      fontSize: type.price,
      fontWeight: "700",
      color: theme.text,
      flexShrink: 1,
    },
    interval: {
      fontSize: type.body,
      color: theme.textSecondary,
      marginLeft: 4,
    },
    savingsContainer: {
      marginBottom: 16,
    },
    savings: {
      fontSize: type.feature,
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
      fontSize: type.feature,
      color: theme.textSecondary,
      flex: 1,
    },
    button: {
      backgroundColor: theme.primary,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
      minHeight: 48,
      justifyContent: "center",
    },
    buttonSecondary: {
      backgroundColor: theme.backgroundSecondary,
    },
    buttonDisabled: {
      backgroundColor: theme.border,
    },
    buttonText: {
      color: theme.onPrimary,
      fontSize: type.button,
      fontWeight: "600",
    },
    buttonTextSecondary: {
      color: theme.text,
    },
    buttonTextDisabled: {
      color: theme.textTertiary,
    },
  });
