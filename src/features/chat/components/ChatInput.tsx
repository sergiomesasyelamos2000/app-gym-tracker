import React from "react";
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTheme } from "../../../contexts/ThemeContext";
import { withOpacity } from "../../../utils/themeStyles";

export const ChatInput: React.FC<{
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onPickPhoto: () => void;
  loading: boolean;
}> = ({ value, onChangeText, onSend, onPickPhoto, loading }) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.card,
          borderTopColor: withOpacity(theme.primary, 14),
        },
      ]}
    >
      <View
        style={[
          styles.field,
          {
            backgroundColor: theme.backgroundSecondary,
            borderColor: withOpacity(theme.primary, 22),
          },
        ]}
      >
        <TextInput
          style={[styles.chatInput, { color: theme.text }]}
          placeholder="Escribe tu mensaje..."
          placeholderTextColor={theme.inputPlaceholder}
          value={value}
          onChangeText={onChangeText}
          editable={!loading}
          multiline
          maxLength={1000}
          textAlignVertical="top"
          blurOnSubmit={false}
        />
      </View>
      <TouchableOpacity
        style={[
          styles.sendButton,
          { backgroundColor: theme.primary },
          loading && styles.sendButtonDisabled,
        ]}
        onPress={onSend}
        disabled={loading}
        testID="chat-send-button"
        accessibilityRole="button"
        accessibilityLabel="Enviar mensaje"
      >
        <Icon name="send" size={22} color={theme.onPrimary} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.photoButton,
          {
            backgroundColor: withOpacity(theme.primary, 10),
            borderColor: withOpacity(theme.primary, 22),
          },
        ]}
        onPress={onPickPhoto}
        disabled={loading}
        testID="chat-photo-button"
        accessibilityRole="button"
        accessibilityLabel="Elegir foto de la galería"
      >
        <Icon name="image" size={22} color={theme.primary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 8,
  },
  field: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  chatInput: {
    fontSize: RFValue(15),
    paddingHorizontal: 4,
    paddingVertical: 8,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    borderRadius: 16,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  photoButton: {
    borderRadius: 16,
    borderWidth: 1,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
