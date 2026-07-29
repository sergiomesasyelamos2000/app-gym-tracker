import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import {
  PLAN_METADATA,
  SubscriptionPlan,
} from "@sergiomesasyelamos2000/shared";
import { useTheme } from "../../../contexts/ThemeContext";
import {
  PRIVACY_POLICY_URL,
  TERMS_OF_USE_URL,
} from "../../common/constants/legalUrls";
import { openExternalUrl } from "../../common/utils/openExternalUrl";

const AUTO_RENEWABLE_PLANS = [
  SubscriptionPlan.MONTHLY,
  SubscriptionPlan.YEARLY,
] as const;

function formatPlanPrice(price: number): string {
  return price.toFixed(2).replace(".", ",");
}

function formatIntervalLabel(interval: "month" | "year"): string {
  return interval === "month" ? "mes" : "año";
}

type Props = {
  onRestorePurchases?: () => void;
  restoreDisabled?: boolean;
};

export function SubscriptionLegalFooter({
  onRestorePurchases,
  restoreDisabled = false,
}: Props) {
  const { theme } = useTheme();
  const showRestore = Platform.OS === "ios" && onRestorePurchases;

  return (
    <View style={styles.container}>
      {AUTO_RENEWABLE_PLANS.map((planId) => {
        const plan = PLAN_METADATA[planId];
        const interval = plan.interval === "month" || plan.interval === "year"
          ? plan.interval
          : "month";

        return (
          <Text
            key={planId}
            style={[styles.planLine, { color: theme.textSecondary }]}
          >
            {plan.name} — {formatPlanPrice(plan.price)} €/
            {formatIntervalLabel(interval)}, renovación automática.
          </Text>
        );
      })}

      <Text style={[styles.disclaimer, { color: theme.textTertiary }]}>
        La suscripción se renueva automáticamente salvo cancelación al menos 24
        h antes del fin del periodo.
      </Text>

      <View style={styles.linksRow}>
        <Text
          style={[styles.link, { color: theme.primary }]}
          onPress={() => openExternalUrl(PRIVACY_POLICY_URL)}
        >
          Política de privacidad
        </Text>
        <Text style={[styles.linkSeparator, { color: theme.textTertiary }]}>
          •
        </Text>
        <Text
          style={[styles.link, { color: theme.primary }]}
          onPress={() => openExternalUrl(TERMS_OF_USE_URL)}
        >
          Términos de uso (EULA)
        </Text>
      </View>

      {showRestore && (
        <Text
          style={[
            styles.restoreLink,
            { color: theme.primary },
            restoreDisabled && styles.restoreDisabled,
          ]}
          onPress={restoreDisabled ? undefined : onRestorePurchases}
        >
          Restaurar compras
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  planLine: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 4,
  },
  disclaimer: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  linksRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  link: {
    fontSize: 13,
    fontWeight: "600",
  },
  linkSeparator: {
    fontSize: 12,
  },
  restoreLink: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: "700",
  },
  restoreDisabled: {
    opacity: 0.5,
  },
});
