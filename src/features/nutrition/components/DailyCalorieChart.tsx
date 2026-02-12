import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import { MealType } from "../../../models/nutrition.model";

interface Props {
  consumed: number;
  target: number;
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

export const DailyCalorieChart: React.FC<Props> = ({ consumed, target }) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const remaining = target - consumed;
  const percentage = Math.min(100, (consumed / target) * 100);

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
          {Math.round(consumed)} de {target} kcal
        </Text>
      </View>

      <View style={styles.caloriesProgressBar}>
        <View
          style={[
            styles.caloriesProgressFill,
            {
              width: `${percentage}%`,
              backgroundColor: remaining > 0 ? "#4CAF50" : "#FF6B6B",
            },
          ]}
        />
      </View>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      alignItems: "center",
      marginBottom: 16,
    },
    caloriesCard: {
      alignItems: "center",
      marginBottom: 16,
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
      fontSize: 14,
      color: theme.textTertiary,
      marginTop: 4,
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
