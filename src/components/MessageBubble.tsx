import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Markdown from "react-native-markdown-display";

interface Message {
  id: number;
  text: string;
  sender: "user" | "bot";
  imageUri?: string;
}

export const MessageBubble: React.FC<{
  message: Message;
  onImagePress: (uri: string) => void;
}> = ({ message, onImagePress }) => (
  <View
    style={[
      styles.messageBubble,
      message.sender === "user" ? styles.userBubble : styles.botBubble,
    ]}
  >
    {message.imageUri ? (
      <TouchableOpacity onPress={() => onImagePress(message.imageUri!)}>
        <Text style={styles.messageText}>{message.text}</Text>
        <Image source={{ uri: message.imageUri }} style={styles.imagePreview} />
      </TouchableOpacity>
    ) : message.sender === "bot" ? (
      <Markdown>{message.text}</Markdown>
    ) : (
      <Text style={styles.messageText}>{message.text}</Text>
    )}
  </View>
);

const styles = StyleSheet.create({
  messageBubble: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    maxWidth: "80%",
  },
  userBubble: {
    backgroundColor: "#4CAF50",
    alignSelf: "flex-end",
  },
  botBubble: {
    backgroundColor: "#e0f2fe",
    alignSelf: "flex-start",
  },
  messageText: {
    fontSize: 16,
    color: "#333",
  },
  imagePreview: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginTop: 8,
  },
});
