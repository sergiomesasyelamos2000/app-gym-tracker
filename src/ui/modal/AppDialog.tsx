import React, { useMemo } from "react";
import {
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { getDialogChrome } from "./modalStyles";
import {
  MODAL_DIALOG_MAX_HEIGHT_RATIO,
  MODAL_DIALOG_MAX_WIDTH,
  MODAL_DIALOG_SIDE_MARGIN,
} from "./modalTokens";
import type { AppDialogProps, ModalDismissReason } from "./types";

const { width: windowWidth, height: windowHeight } = Dimensions.get("window");

export function AppDialog({
  visible,
  onDismiss,
  children,
  title,
  dismissOnBackdrop = false,
  dismissOnBack = true,
  avoidKeyboard = true,
  maxWidth = MODAL_DIALOG_MAX_WIDTH,
  scrollable = false,
  contentStyle,
  testID,
}: AppDialogProps) {
  const { theme } = useTheme();
  const chrome = useMemo(() => getDialogChrome(theme), [theme]);

  const dismiss = (reason: ModalDismissReason) => {
    onDismiss(reason);
  };

  const cardWidth = Math.min(
    windowWidth - MODAL_DIALOG_SIDE_MARGIN * 2,
    maxWidth
  );
  const maxHeight = windowHeight * MODAL_DIALOG_MAX_HEIGHT_RATIO;

  const body = scrollable ? (
    <ScrollView
      bounces={false}
      keyboardShouldPersistTaps="handled"
      style={{ maxHeight: maxHeight - (title ? 56 : 0) }}
    >
      {children}
    </ScrollView>
  ) : (
    children
  );

  const card = (
    <Pressable
      accessibilityViewIsModal
      style={[chrome.card, { width: cardWidth, maxHeight }, contentStyle]}
      onPress={(e) => e.stopPropagation()}
    >
      {title ? <Text style={chrome.title}>{title}</Text> : null}
      {body}
    </Pressable>
  );

  const content = (
    <Pressable
      style={chrome.overlay}
      testID={testID ? `${testID}-overlay` : undefined}
      onPress={() => {
        if (dismissOnBackdrop) dismiss("backdrop");
      }}
      accessibilityRole="none"
    >
      {card}
    </Pressable>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        if (dismissOnBack) dismiss("back");
      }}
      testID={testID}
    >
      {avoidKeyboard ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </Modal>
  );
}
