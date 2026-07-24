import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import type { NutritionPlanDay } from "@sergiomesasyelamos2000/shared";
import { Theme } from "../../../../contexts/ThemeContext";
import MacroSummary from "./MacroSummary";
import MealCard from "./MealCard";

interface PlanDaySectionProps {
  day: NutritionPlanDay;
  theme: Theme;
  defaultExpanded?: boolean;
}

export default function PlanDaySection({
  day,
  theme,
  defaultExpanded = false,
}: PlanDaySectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded((prev) => !prev)}
        activeOpacity={0.85}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.dayLabel}>{day.label}</Text>
          <View style={styles.badgesRow}>
            {day.isTrainingDay ? (
              <View style={[styles.badge, { backgroundColor: theme.primary + "22" }]}>
                <Text style={[styles.badgeText, { color: theme.primary }]}>
                  Entreno
                </Text>
              </View>
            ) : null}
            <Text style={styles.dayIndex}>Día {day.dayIndex}</Text>
          </View>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={theme.textSecondary}
        />
      </TouchableOpacity>

      <MacroSummary theme={theme} compact totals={day.dailyTotals} />

      {expanded ? (
        <View style={styles.meals}>
          {day.meals.map((meal, index) => (
            <MealCard key={`${meal.mealType}-${meal.name}-${index}`} meal={meal} theme={theme} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.card,
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    headerLeft: {
      flex: 1,
      paddingRight: 8,
    },
    dayLabel: {
      fontSize: RFValue(15),
      fontWeight: "700",
      color: theme.text,
    },
    badgesRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 4,
    },
    badge: {
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    badgeText: {
      fontSize: RFValue(10),
      fontWeight: "700",
    },
    dayIndex: {
      fontSize: RFValue(11),
      color: theme.textSecondary,
    },
    meals: {
      marginTop: 4,
    },
  });
