import React from "react";
import {
  Modal,
  ModalProps,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../contexts/ThemeContext";
import { getModalStyle } from "../utils/themeStyles";

interface ThemedModalProps extends Omit<ModalProps, "children"> {
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  contentStyle?: ViewStyle;
}

export function ThemedModal({
  title,
  children,
  onClose,
  contentStyle,
  visible,
  ...modalProps
}: ThemedModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const modalStyles = getModalStyle(theme);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      {...modalProps}
    >
      <TouchableOpacity
        style={modalStyles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={[
            modalStyles.content,
            { paddingBottom: Math.max(insets.bottom, 24) },
            contentStyle,
          ]}
        >
          <View style={modalStyles.handle} />
          {title ? <Text style={modalStyles.title}>{title}</Text> : null}
          {children}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({});
