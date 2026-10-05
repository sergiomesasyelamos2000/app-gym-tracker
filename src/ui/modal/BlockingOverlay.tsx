import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Modal,
  Text,
  View,
} from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { getBlockingChrome } from "./modalStyles";
import type { BlockingOverlayProps } from "./types";

export function BlockingOverlay({
  visible,
  message,
  testID,
}: BlockingOverlayProps) {
  const { theme } = useTheme();
  const chrome = useMemo(() => getBlockingChrome(theme), [theme]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        // Non-dismissable: consume Android back while work is in progress.
      }}
      testID={testID}
    >
      <View
        style={chrome.overlay}
        accessibilityViewIsModal
        accessibilityState={{ busy: true }}
      >
        <ActivityIndicator size="large" color={theme.primary} />
        {message ? <Text style={chrome.message}>{message}</Text> : null}
      </View>
    </Modal>
  );
}
