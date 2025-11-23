import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Markdown from "react-native-markdown-display";
import { useTheme } from "../../../contexts/ThemeContext";

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
  const isUser = message.sender === "user";
  const isBot = message.sender === "bot";
  const { theme } = useTheme();

  const renderContent = () => {
    if (message.imageUri) {
      return (
        <TouchableOpacity onPress={() => onImagePress?.(message.imageUri!)}>
          <Text style={styles.messageText}>{message.text}</Text>
          <Image
            source={{ uri: message.imageUri }}
            style={styles.imagePreview}
          />
        </TouchableOpacity>
      );
    }

    if (isBot) {
      return <Markdown>{message.text}</Markdown>;
    }

    return <Text style={styles.messageText}>{message.text}</Text>;
  };

  return (
    <View
      style={[
        styles.messageBubble,
        isUser
          ? [styles.userBubble, { backgroundColor: theme.success }]
          : [styles.botBubble, { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }],
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
