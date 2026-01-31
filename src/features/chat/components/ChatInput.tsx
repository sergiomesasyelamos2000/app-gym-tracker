import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTheme } from "../../../contexts/ThemeContext";

export const ChatInput: React.FC<{
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onOpenCamera: () => void;
  loading: boolean;
}> = ({ value, onChangeText, onSend, onOpenCamera, loading }) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.inputContainer,
        { backgroundColor: theme.card, shadowColor: theme.shadowColor },
      ]}
    >
      <TextInput
        style={[styles.chatInput, { color: theme.text }]}
        placeholder="Escribe tu mensaje..."
        placeholderTextColor={theme.textTertiary}
        value={value}
        onChangeText={onChangeText}
        editable={!loading}
        multiline
        maxLength={1000}
        textAlignVertical="top"
        blurOnSubmit={false}
      />
      <TouchableOpacity
        style={[
          styles.sendButton,
          { backgroundColor: theme.primary },
          loading && styles.sendButtonDisabled,
        ]}
        onPress={onSend}
        disabled={loading}
        testID="chat-send-button"
      >
        <Icon name="send" size={24} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.sendButton, { backgroundColor: theme.primary }]}
        onPress={onOpenCamera}
      >
        <Icon name="image" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 12,
    elevation: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    margin: 8,
  },
  chatInput: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 8,
    paddingVertical: 8,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    borderRadius: 12,
    padding: 12,
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
