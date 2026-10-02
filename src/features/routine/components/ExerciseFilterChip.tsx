import React, { memo } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import { Theme, useTheme } from "../../../contexts/ThemeContext";

type ExerciseFilterChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function ExerciseFilterChipComponent({
  label,
  selected,
  onPress,
}: ExerciseFilterChipProps) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipActive]}
      activeOpacity={1}
      onPress={onPress}
    >
      <Text style={[styles.chipText, selected && styles.chipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export const ExerciseFilterChip = memo(ExerciseFilterChipComponent);

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    chip: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    chipActive: {
      borderColor: theme.primary,
      backgroundColor: `${theme.primary}20`,
    },
    chipText: {
      color: theme.textSecondary,
      fontSize: RFValue(13),
      fontWeight: "500",
    },
    chipTextActive: {
      color: theme.primary,
      fontWeight: "700",
    },
  });
