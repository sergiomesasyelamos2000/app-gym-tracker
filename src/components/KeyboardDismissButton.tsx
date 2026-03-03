import React, { useEffect, useMemo, useState } from "react";
import {
  Keyboard,
  KeyboardEvent,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../contexts/ThemeContext";

export const GLOBAL_KEYBOARD_ACCESSORY_ID = "global-keyboard-dismiss-accessory";

export default function KeyboardDismissButton() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const handleDismissKeyboard = () => {
    const state = TextInput.State as unknown as {
      currentlyFocusedInput?: () => { blur?: () => void } | null;
    };

    const focusedInput = state.currentlyFocusedInput?.();
    focusedInput?.blur?.();

    setVisible(false);
    setKeyboardHeight(0);
    Keyboard.dismiss();
    requestAnimationFrame(() => Keyboard.dismiss());
    setTimeout(() => Keyboard.dismiss(), 60);
  };

  useEffect(() => {
    const onShow = (event: KeyboardEvent) => {
      setKeyboardHeight(event.endCoordinates?.height || 0);
      setVisible(true);
    };

    const onHide = () => {
      setVisible(false);
      setKeyboardHeight(0);
    };

    const showSub = Keyboard.addListener("keyboardDidShow", onShow);
    const hideSub = Keyboard.addListener("keyboardDidHide", onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const containerStyle = useMemo(
    () => {
      const keyboardMetricsHeight = Keyboard.metrics?.()?.height ?? 0;
      const effectiveKeyboardHeight = Math.max(
        0,
        keyboardHeight || keyboardMetricsHeight
      );

      const bottomOffset =
        Platform.OS === "ios"
          ? Math.max(insets.bottom + 8, effectiveKeyboardHeight + 8)
          : 12;

      return [
        styles.container,
        {
          bottom: bottomOffset,
        },
      ];
    },
    [insets.bottom, keyboardHeight]
  );

  if (!visible) return null;

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
