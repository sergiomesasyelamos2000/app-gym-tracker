import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import {
  EXERCISE_PROGRESS_TEASER_PERIOD,
  compareWithPreviousPeriod,
  type ExerciseProgressDataPoint,
} from "../../../utils/statsHelpers";
import { teaserCopy } from "../utils/exerciseProgressCopy";

type Props = {
  allProgressData: ExerciseProgressDataPoint[];
  onPress: () => void;
};

export function ExerciseProgressTeaser({
  allProgressData,
  onPress,
}: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const comparison = useMemo(
    () =>
      compareWithPreviousPeriod(
        allProgressData,
        EXERCISE_PROGRESS_TEASER_PERIOD
      ),
    [allProgressData]
  );
  const copy = useMemo(
    () => teaserCopy(allProgressData.length, comparison),
    [allProgressData.length, comparison]
  );

  return (
    <TouchableOpacity
      style={[styles.card, copy.disabled && styles.cardDisabled]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={copy.disabled}
      accessibilityRole="button"
      accessibilityLabel="Ver progreso del ejercicio"
    >
      <View style={styles.textCol}>
        <Text style={styles.eyebrow}>Progreso</Text>
        <Text style={styles.line1}>{copy.line1}</Text>
        <Text style={styles.line2}>{copy.line2}</Text>
      </View>
      {!copy.disabled ? (
        <Icon name="chevron-right" size={24} color={theme.primary} />
      ) : null}
    </TouchableOpacity>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      marginHorizontal: 16,
      marginTop: 8,
      marginBottom: 8,
      backgroundColor: theme.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    cardDisabled: {
      opacity: 0.85,
    },
    textCol: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },
    eyebrow: {
      color: theme.primary,
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    line1: {
      color: theme.text,
      fontSize: 15,
      fontWeight: "700",
      lineHeight: 20,
    },
    line2: {
      color: theme.textSecondary,
      fontSize: 13,
      lineHeight: 18,
    },
  });
