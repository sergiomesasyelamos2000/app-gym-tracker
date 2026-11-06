import { BarChart3 } from "lucide-react-native";
import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import {
  EMPTY_EXERCISE_COPY,
  EMPTY_PERIOD_COPY,
  UNAVAILABLE_COPY,
} from "../utils/exerciseProgressCopy";

type Props =
  | {
      variant: "empty-period";
      onAction: () => void;
    }
  | {
      variant: "empty-exercise";
    }
  | {
      variant: "unavailable";
      onAction: () => void;
    };

export function ExerciseSessionStatus(props: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const copy =
    props.variant === "empty-period"
      ? EMPTY_PERIOD_COPY
      : props.variant === "empty-exercise"
        ? EMPTY_EXERCISE_COPY
        : UNAVAILABLE_COPY;

  return (
    <View style={styles.container}>
      <BarChart3 size={40} color={theme.textSecondary} />
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.body}>{copy.body}</Text>
      {"onAction" in props && "action" in copy ? (
        <TouchableOpacity
          style={styles.button}
          onPress={props.onAction}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>{copy.action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
      paddingVertical: 40,
      gap: 10,
    },
    title: {
      color: theme.text,
      fontSize: 17,
      fontWeight: "700",
      textAlign: "center",
    },
    body: {
      color: theme.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      textAlign: "center",
    },
    button: {
      marginTop: 8,
      backgroundColor: theme.primary,
      borderRadius: 12,
      paddingHorizontal: 18,
      paddingVertical: 12,
    },
    buttonText: {
      color: theme.onPrimary,
      fontWeight: "700",
      fontSize: 14,
    },
  });
