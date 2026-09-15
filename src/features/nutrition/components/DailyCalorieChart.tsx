import { Ionicons } from "@expo/vector-icons";
import React, { memo, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { MealType } from "@sergiomesasyelamos2000/shared";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import { computeDailyEnergyBudget } from "../utils/dailyEnergyBudget";

interface Props {
  consumed: number;
  target: number;
  /** Workout calories burned on this diary day (kcal). */
  burned?: number;
}

// Configuración de tipos de comida con iconos, etiquetas y colores
export const MEAL_CONFIG: Record<
  MealType,
  { icon: keyof typeof Ionicons.glyphMap; label: string; color: string }
> = {
  breakfast: { icon: "cafe-outline", label: "Desayuno", color: "#FF9800" },
  lunch: { icon: "restaurant-outline", label: "Almuerzo", color: "#4CAF50" },
  dinner: { icon: "moon-outline", label: "Cena", color: "#673AB7" },
  snack: { icon: "pizza-outline", label: "Snack", color: "#2196F3" },
};

function DailyCalorieChartComponent({
  consumed,
  target,
  burned = 0,
}: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { burned: burnedKcal, remaining, percentage } = useMemo(
    () => computeDailyEnergyBudget({ consumed, target, burned }),
    [burned, consumed, target]
  );

  const progressFillStyle = useMemo(
    () => ({
      width: `${percentage}%` as `${number}%`,
      backgroundColor: remaining > 0 ? "#4CAF50" : "#FF6B6B",
    }),
    [percentage, remaining]
  );

  return (
    <View style={styles.container}>
      <View style={styles.caloriesCard}>
        <Text style={styles.caloriesLabel}>
          {remaining > 0 ? "Calorías disponibles" : "Calorías excedidas"}
        </Text>
        <Text
          style={[
            styles.caloriesValue,
            remaining < 0 && styles.caloriesValueExceeded,
          ]}
        >
          {Math.abs(Math.round(remaining))}
        </Text>
        <Text style={styles.caloriesSubtext}>
          {Math.round(consumed)} ingeridas
          {burnedKcal > 0 ? ` · +${burnedKcal} quemadas` : ""}
          {" · "}
          meta {Math.round(target)}
        </Text>
      </View>

      <View style={styles.breakdownRow}>
        <View style={styles.breakdownItem}>
          <Text style={styles.breakdownValue}>{Math.round(consumed)}</Text>
          <Text style={styles.breakdownLabel}>Ingeridas</Text>
        </View>
        <View
          style={[styles.breakdownDivider, { backgroundColor: theme.divider }]}
        />
        <View style={styles.breakdownItem}>
          <Text
            style={[
              styles.breakdownValue,
              burnedKcal > 0 && styles.breakdownBurned,
            ]}
          >
            {burnedKcal > 0 ? `+${burnedKcal}` : "0"}
          </Text>
          <Text style={styles.breakdownLabel}>Quemadas</Text>
        </View>
        <View
          style={[styles.breakdownDivider, { backgroundColor: theme.divider }]}
        />
        <View style={styles.breakdownItem}>
          <Text style={styles.breakdownValue}>{Math.round(target)}</Text>
          <Text style={styles.breakdownLabel}>Objetivo</Text>
        </View>
      </View>

      <View style={styles.caloriesProgressBar}>
        <View style={[styles.caloriesProgressFill, progressFillStyle]} />
      </View>
    </View>
  );
}

export const DailyCalorieChart = memo(DailyCalorieChartComponent);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      alignItems: "center",
      marginBottom: 16,
      width: "100%",
    },
    caloriesCard: {
      alignItems: "center",
      marginBottom: 12,
    },
    caloriesLabel: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 8,
    },
    caloriesValue: {
      fontSize: 48,
      fontWeight: "700",
      color: theme.success,
    },
    caloriesValueExceeded: {
      color: theme.error,
    },
    caloriesSubtext: {
      fontSize: 13,
      color: theme.textTertiary,
      marginTop: 4,
      textAlign: "center",
      paddingHorizontal: 8,
    },
    breakdownRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
      width: "100%",
      marginBottom: 14,
      paddingHorizontal: 4,
    },
    breakdownItem: {
      flex: 1,
      alignItems: "center",
    },
    breakdownValue: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.text,
    },
    breakdownBurned: {
      color: theme.error,
    },
    breakdownLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: theme.textSecondary,
      marginTop: 2,
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    breakdownDivider: {
      width: 1,
      height: 28,
    },
    caloriesProgressBar: {
      width: "100%",
      height: 8,
      backgroundColor: theme.border,
      borderRadius: 4,
      overflow: "hidden",
    },
    caloriesProgressFill: {
      height: "100%",
      borderRadius: 4,
    },
  });
