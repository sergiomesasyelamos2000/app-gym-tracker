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
    <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
      <TextInput
        style={[styles.chatInput, { color: theme.text }]}
        placeholder="Escribe tu mensaje..."
        placeholderTextColor={theme.placeholder}
        value={value}
        onChangeText={onChangeText}
        editable={!loading}
      />
      <TouchableOpacity
        style={[styles.sendButton, { backgroundColor: theme.success }, loading && { opacity: 0.5 }]}
        onPress={onSend}
        disabled={loading}
      >
        <Icon name="send" size={24} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity style={[styles.sendButton, { backgroundColor: theme.success }]} onPress={onOpenCamera}>
        <Icon name="image" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    elevation: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chatInput: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 8,
  },
  sendButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    padding: 12,
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: "#a5d6a7",
  },
});
