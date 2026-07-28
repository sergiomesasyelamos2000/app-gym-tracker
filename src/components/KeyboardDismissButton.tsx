import React, { useMemo } from "react";
import {
  Keyboard,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../contexts/ThemeContext";
import {
  useKeyboardHeight,
  useRestToastKeyboardActive,
} from "../hooks/useKeyboardHeight";

export const GLOBAL_KEYBOARD_ACCESSORY_ID = "global-keyboard-dismiss-accessory";

export default function KeyboardDismissButton() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const restToastKeyboardActive = useRestToastKeyboardActive();

  const handleDismissKeyboard = () => {
    const state = TextInput.State as unknown as {
      currentlyFocusedInput?: () => { blur?: () => void } | null;
    };

    const focusedInput = state.currentlyFocusedInput?.();
    focusedInput?.blur?.();

    Keyboard.dismiss();
    requestAnimationFrame(() => Keyboard.dismiss());
    setTimeout(() => Keyboard.dismiss(), 60);
  };

  const containerStyle = useMemo(() => {
    const metricsHeight = Keyboard.metrics?.()?.height ?? 0;
    const effectiveKeyboardHeight = Math.max(
      0,
      keyboardHeight || metricsHeight
    );

    const bottomOffset =
      effectiveKeyboardHeight > 0
        ? effectiveKeyboardHeight + 8
        : Math.max(insets.bottom + 8, 12);

    return [
      styles.container,
      {
        bottom: bottomOffset,
      },
    ];
  }, [insets.bottom, keyboardHeight]);

  if (keyboardHeight <= 0 || restToastKeyboardActive) return null;

  return (
    <View style={containerStyle} pointerEvents="box-none">
      <View
        style={[
          styles.buttonContainer,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            shadowColor: theme.shadowColor,
          },
        ]}
      >
        <Pressable
          onPressIn={handleDismissKeyboard}
          style={styles.button}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Ocultar teclado"
        >
          <Icon name="keyboard-hide" size={20} color={theme.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 12,
    zIndex: 1000,
  },
  buttonContainer: {
    borderRadius: 10,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    elevation: 4,
  },
  button: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
});
