import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import {
  getDestructiveButtonStyle,
  getDestructiveButtonTextStyle,
  getGhostButtonStyle,
  getPrimaryButtonStyle,
  getPrimaryButtonTextStyle,
  getSecondaryButtonStyle,
  getSecondaryButtonTextStyle,
} from "../utils/themeStyles";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";

interface ThemedButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function ThemedButton({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  style,
  textStyle,
}: ThemedButtonProps) {
  const { theme } = useTheme();

  const containerStyle =
    variant === "primary"
      ? getPrimaryButtonStyle(theme)
      : variant === "secondary"
        ? getSecondaryButtonStyle(theme)
        : variant === "destructive"
          ? getDestructiveButtonStyle(theme)
          : getGhostButtonStyle(theme);

  const labelStyle =
    variant === "primary"
      ? getPrimaryButtonTextStyle(theme)
      : variant === "destructive"
        ? getDestructiveButtonTextStyle(theme)
        : variant === "secondary"
          ? getSecondaryButtonTextStyle(theme)
          : ({ color: theme.primary, fontSize: 16, fontWeight: "600" } as TextStyle);

  const spinnerColor =
    variant === "primary" || variant === "destructive"
      ? variant === "primary"
        ? theme.onPrimary
        : theme.onDestructive
      : theme.primary;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[
        containerStyle,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <Text style={[labelStyle, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.5,
  },
});
