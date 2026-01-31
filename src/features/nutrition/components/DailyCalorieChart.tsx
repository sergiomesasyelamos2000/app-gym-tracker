import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../../contexts/ThemeContext";

interface Props {
  consumed: number;
  target: number;
}

export const DailyCalorieChart: React.FC<Props> = ({ consumed, target }) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const remaining = target - consumed;
  const percentage = Math.min(100, (consumed / target) * 100);

  return (
    <View style={styles.caloriesCard}>
      <Text>Dummy Chart</Text>
    </View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    caloriesCard: { alignItems: "center", marginBottom: 16 },
    caloriesLabel: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 8,
    },
    caloriesValue: { fontSize: 48, fontWeight: "700", color: theme.success },
    caloriesValueExceeded: { color: theme.error },
    caloriesSubtext: {
      fontSize: 14,
      color: theme.textTertiary,
      marginTop: 4,
      marginBottom: 12,
    },
    caloriesProgressBar: {
      width: "100%",
      height: 8,
      backgroundColor: theme.border,
      borderRadius: 4,
      overflow: "hidden",
    },
    caloriesProgressFill: { height: "100%", borderRadius: 4 },
  });
