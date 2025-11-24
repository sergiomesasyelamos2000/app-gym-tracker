import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Markdown from "react-native-markdown-display";
import { useTheme } from "../../../contexts/ThemeContext";
import { withOpacity } from "../../../utils/themeStyles";

export type Message = {
  id: number;
  text: string;
  sender: "user" | "bot";
  imageUri?: string;
};

type Props = {
  message: Message;
  onImagePress?: (uri: string) => void;
};

export const MessageBubble: React.FC<Props> = ({ message, onImagePress }) => {
  const { theme } = useTheme();
  const isUser = message.sender === "user";
  const isBot = message.sender === "bot";

  const renderContent = () => {
    if (message.imageUri) {
      return (
        <TouchableOpacity onPress={() => onImagePress?.(message.imageUri!)}>
          <Text style={[styles.messageText, { color: isUser ? "#FFFFFF" : theme.text }]}>{message.text}</Text>
          <Image
            source={{ uri: message.imageUri }}
            style={styles.imagePreview}
          />
        </TouchableOpacity>
      );
    }

    if (isBot) {
      return (
        <Markdown style={{
          body: { color: theme.text },
          code_block: { backgroundColor: theme.inputBackground, color: theme.text },
          fence: { backgroundColor: theme.inputBackground, color: theme.text },
        }}>
          {message.text}
        </Markdown>
      );
    }

    return <Text style={[styles.messageText, { color: "#FFFFFF" }]}>{message.text}</Text>;
  };

  return (
    <View
      style={[
        styles.messageBubble,
        isUser ? { backgroundColor: theme.primary, alignSelf: "flex-end" } : { backgroundColor: theme.card, alignSelf: "flex-start" },
      ]}
    >
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  messageBubble: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    maxWidth: "80%",
  },
  messageText: {
    fontSize: 16,
  },
  imagePreview: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginTop: 8,
  },
});
