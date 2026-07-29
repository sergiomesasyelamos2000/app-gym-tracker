import React from "react";
import {
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { getInputStyle } from "../utils/themeStyles";

interface ThemedTextInputProps extends TextInputProps {
  containerStyle?: ViewStyle;
}

export function ThemedTextInput({
  containerStyle,
  style,
  ...props
}: ThemedTextInputProps) {
  const { theme, isDark } = useTheme();

  return (
    <View style={containerStyle}>
      <TextInput
        {...props}
        style={[
          getInputStyle(theme),
          { color: theme.text },
          styles.input,
          style,
        ]}
        placeholderTextColor={
          props.placeholderTextColor ?? theme.inputPlaceholder
        }
        keyboardAppearance={isDark ? "dark" : "light"}
        selectionColor={theme.primary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    fontSize: 16,
  },
});
