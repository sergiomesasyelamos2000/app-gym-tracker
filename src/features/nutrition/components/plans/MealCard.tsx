import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import type { NutritionPlanMeal } from "@sergiomesasyelamos2000/shared";
import { Theme } from "../../../../contexts/ThemeContext";
import { MEAL_TYPE_CONFIG } from "../../utils/planHelpers";
import MacroSummary from "./MacroSummary";

interface MealCardProps {
  meal: NutritionPlanMeal;
  theme: Theme;
}

export default function MealCard({ meal, theme }: MealCardProps) {
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const mealConfig = MEAL_TYPE_CONFIG[meal.mealType];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: mealConfig.color + "22" },
          ]}
        >
          <Ionicons
            name={mealConfig.icon as keyof typeof Ionicons.glyphMap}
            size={18}
            color={mealConfig.color}
          />
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.mealType}>{mealConfig.label}</Text>
          <Text style={styles.mealName}>{meal.name}</Text>
        </View>
      </View>

      <MacroSummary theme={theme} compact totals={meal.totals} />

      {meal.foods.map((food, index) => (
        <View key={`${food.name}-${index}`} style={styles.foodRow}>
          <Text style={styles.foodName} numberOfLines={2}>
            {food.name}
          </Text>
          <Text style={styles.foodMeta}>
            {food.quantity}
            {food.unit} · {Math.round(food.calories)} kcal
          </Text>
        </View>
      ))}

      {meal.instructions ? (
        <Text style={styles.instructions}>{meal.instructions}</Text>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.background,
      borderRadius: 12,
      padding: 12,
      marginTop: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
      gap: 10,
    },
    iconWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
    },
    titleBlock: {
      flex: 1,
    },
    mealType: {
      fontSize: RFValue(10),
      color: theme.textSecondary,
      textTransform: "uppercase",
      fontWeight: "600",
    },
    mealName: {
      fontSize: RFValue(13),
      fontWeight: "600",
      color: theme.text,
      marginTop: 2,
    },
    foodRow: {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
    },
    foodName: {
      fontSize: RFValue(12),
      color: theme.text,
      fontWeight: "500",
    },
    foodMeta: {
      fontSize: RFValue(11),
      color: theme.textSecondary,
      marginTop: 2,
    },
    instructions: {
      marginTop: 10,
      fontSize: RFValue(11),
      color: theme.textSecondary,
      fontStyle: "italic",
    },
  });
