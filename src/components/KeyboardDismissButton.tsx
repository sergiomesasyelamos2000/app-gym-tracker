import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  InputAccessoryView,
  Keyboard,
  KeyboardEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../contexts/ThemeContext";

export const GLOBAL_KEYBOARD_ACCESSORY_ID = "global-keyboard-dismiss-accessory";

export default function KeyboardDismissButton() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = (event: KeyboardEvent) => {
      setKeyboardHeight(event.endCoordinates?.height || 0);
      setVisible(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    };

    const onHide = () => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }).start(() => {
        setVisible(false);
        setKeyboardHeight(0);
      });
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [fadeAnim]);

  const containerStyle = useMemo(
    () => [
      styles.container,
      {
        bottom: Math.max(12, keyboardHeight - insets.bottom + 8),
      },
    ],
    [insets.bottom, keyboardHeight]
  );

  if (Platform.OS === "ios") {
    return (
      <InputAccessoryView nativeID={GLOBAL_KEYBOARD_ACCESSORY_ID}>
        <View
          style={[
            styles.iosAccessoryContainer,
            {
              backgroundColor: theme.card,
              borderTopColor: theme.border,
            },
          ]}
        >
          <Pressable onPress={Keyboard.dismiss} style={styles.iosAccessoryButton}>
            <Text style={[styles.iosAccessoryText, { color: theme.primary }]}>
              Listo
            </Text>
          </Pressable>
        </View>
      </InputAccessoryView>
    );
  }

  if (!visible) return null;

  return (
    <Animated.View style={[containerStyle, { opacity: fadeAnim }]}>
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
        <Pressable onPress={Keyboard.dismiss} style={styles.button}>
          <Text style={[styles.text, { color: theme.text }]}>Ocultar teclado</Text>
        </Pressable>
      </View>
    </Animated.View>
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
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  text: {
    fontSize: 13,
    fontWeight: "700",
  },
  iosAccessoryContainer: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "flex-end",
  },
  iosAccessoryButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  iosAccessoryText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
