import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import type { NutritionPlanMacroTotals } from "@sergiomesasyelamos2000/shared";
import { Theme } from "../../../../contexts/ThemeContext";

interface MacroSummaryProps {
  totals: NutritionPlanMacroTotals;
  theme: Theme;
  compact?: boolean;
}

export default function MacroSummary({
  totals,
  theme,
  compact = false,
}: MacroSummaryProps) {
  const styles = React.useMemo(
    () => createStyles(theme, compact),
    [theme, compact]
  );

  return (
    <View style={styles.container}>
      <View style={styles.item}>
        <Text style={styles.value}>{Math.round(totals.calories)}</Text>
        <Text style={styles.label}>kcal</Text>
      </View>
      <View style={styles.item}>
        <Text style={styles.value}>{Math.round(totals.protein)}g</Text>
        <Text style={styles.label}>Prot</Text>
      </View>
      <View style={styles.item}>
        <Text style={styles.value}>{Math.round(totals.carbs)}g</Text>
        <Text style={styles.label}>Carb</Text>
      </View>
      <View style={styles.item}>
        <Text style={styles.value}>{Math.round(totals.fat)}g</Text>
        <Text style={styles.label}>Grasa</Text>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme, compact: boolean) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: compact ? 6 : 10,
    },
    item: {
      flex: 1,
      backgroundColor: theme.card,
      borderRadius: 10,
      paddingVertical: compact ? 8 : 10,
      paddingHorizontal: 6,
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.border,
    },
    value: {
      fontSize: RFValue(compact ? 12 : 13),
      fontWeight: "700",
      color: theme.text,
    },
    label: {
      fontSize: RFValue(10),
      color: theme.textSecondary,
      marginTop: 2,
    },
  });
