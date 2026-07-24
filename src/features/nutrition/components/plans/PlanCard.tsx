import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import type { NutritionPlanResponseDto as NutritionPlan } from "@sergiomesasyelamos2000/shared";
import { Theme } from "../../../../contexts/ThemeContext";
import {
  formatPlanDate,
  getPlanStatusColor,
  PLAN_STATUS_LABELS,
} from "../../utils/planHelpers";
import MacroSummary from "./MacroSummary";

interface PlanCardProps {
  plan: NutritionPlan;
  theme: Theme;
  onPress: () => void;
}

export default function PlanCard({ plan, theme, onPress }: PlanCardProps) {
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const statusColor = getPlanStatusColor(plan.status, theme);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={2}>
            {plan.name}
          </Text>
          <Text style={styles.subtitle}>
            {plan.durationDays} días · {formatPlanDate(plan.updatedAt)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + "22" }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {PLAN_STATUS_LABELS[plan.status]}
          </Text>
        </View>
      </View>

      {plan.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {plan.description}
        </Text>
      ) : null}

      <MacroSummary
        theme={theme}
        compact
        totals={{
          calories: plan.avgDailyCalories,
          protein: plan.avgDailyProtein,
          carbs: plan.avgDailyCarbs,
          fat: plan.avgDailyFat,
        }}
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Ver plan completo</Text>
        <Ionicons name="chevron-forward" size={18} color={theme.primary} />
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.card,
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: 10,
      gap: 8,
    },
    titleBlock: {
      flex: 1,
    },
    title: {
      fontSize: RFValue(15),
      fontWeight: "700",
      color: theme.text,
    },
    subtitle: {
      fontSize: RFValue(11),
      color: theme.textSecondary,
      marginTop: 4,
    },
    statusBadge: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    statusText: {
      fontSize: RFValue(10),
      fontWeight: "700",
    },
    description: {
      fontSize: RFValue(12),
      color: theme.textSecondary,
      marginBottom: 10,
    },
    footer: {
      marginTop: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 4,
    },
    footerText: {
      fontSize: RFValue(12),
      color: theme.primary,
      fontWeight: "600",
    },
  });
