import React from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import Markdown from "react-native-markdown-display";
import { useTheme } from "../../../contexts/ThemeContext";
import { withOpacity } from "../../../utils/themeStyles";
import { ExportButton } from "./ExportButton";
import { isExportableContent } from "../../../utils/exportUtils";

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
          <Text
            style={[
              styles.messageText,
              { color: isUser ? "#FFFFFF" : theme.text },
            ]}
          >
            {message.text}
          </Text>
          <Image
            source={{ uri: message.imageUri }}
            style={styles.imagePreview}
          />
        </TouchableOpacity>
      );
    }

    if (isBot) {
      return (
        <Markdown
          style={{
            body: {
              color: theme.text,
              fontSize: 15,
              lineHeight: 22,
            },
            code_block: {
              backgroundColor: theme.inputBackground,
              color: theme.text,
              padding: 12,
              borderRadius: 8,
              marginVertical: 8,
            },
            fence: {
              backgroundColor: theme.inputBackground,
              color: theme.text,
              padding: 12,
              borderRadius: 8,
              marginVertical: 8,
            },
            table: {
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 8,
              backgroundColor: theme.card,
              overflow: "hidden",
            },
            thead: {
              backgroundColor: withOpacity(theme.primary, 0.15),
            },
            tbody: {
              backgroundColor: theme.card,
            },
            tr: {
              flexDirection: "row",
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            },
            th: {
              flex: 1,
              minWidth: 100,
              padding: 12,
              fontWeight: "bold",
              fontSize: 13,
              color: theme.text,
              textAlign: "center",
              borderRightWidth: 1,
              borderRightColor: theme.border,
              justifyContent: "center",
              alignItems: "center",
            },
            td: {
              flex: 1,
              minWidth: 100,
              padding: 10,
              fontSize: 12,
              color: theme.text,
              textAlign: "center",
              borderRightWidth: 1,
              borderRightColor: theme.border,
              justifyContent: "center",
              alignItems: "center",
            },
            link: {
              color: theme.primary,
              textDecorationLine: "underline",
            },
            list_item: {
              marginVertical: 4,
            },
          }}
          rules={{
            table: (node, children, parent, styles) => (
              <View key={node.key} style={{ marginVertical: 8 }}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={true}
                  persistentScrollbar={true}
                >
                  <View
                    style={[
                      styles.table,
                      {
                        borderWidth: 1,
                        borderColor: theme.border,
                        borderRadius: 8,
                        overflow: "hidden",
                        backgroundColor: theme.card,
                      },
                    ]}
                  >
                    {children}
                  </View>
                </ScrollView>
                <Text
                  style={[
                    styles.scrollHint,
                    { color: withOpacity(theme.text, 0.5) },
                  ]}
                >
                  ← Desliza para ver más →
                </Text>
              </View>
            ),
            tr: (node, children, parent, styles) => (
              <View
                key={node.key}
                style={[
                  styles.tableRow,
                  {
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                  },
                ]}
              >
                {children}
              </View>
            ),
            th: (node, children, parent, styles) => (
              <View
                key={node.key}
                style={[
                  styles.tableCell,
                  styles.tableHeader,
                  {
                    backgroundColor: withOpacity(theme.primary, 0.15),
                    borderRightWidth: 1,
                    borderRightColor: theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tableCellText,
                    styles.tableHeaderText,
                    { color: theme.text },
                  ]}
                >
                  {children}
                </Text>
              </View>
            ),
            td: (node, children, parent, styles) => (
              <View
                key={node.key}
                style={[
                  styles.tableCell,
                  {
                    borderRightWidth: 1,
                    borderRightColor: theme.border,
                    backgroundColor: theme.card,
                  },
                ]}
              >
                <Text style={[styles.tableCellText, { color: theme.text }]}>
                  {children}
                </Text>
              </View>
            ),
          }}
        >
          {message.text}
        </Markdown>
      );
    }

    return (
      <Text style={[styles.messageText, { color: "#FFFFFF" }]}>
        {message.text}
      </Text>
    );
  };

  return (
    <View
      style={[
        styles.messageBubble,
        isUser
          ? { backgroundColor: theme.primary, alignSelf: "flex-end" }
          : { backgroundColor: theme.card, alignSelf: "flex-start" },
      ]}
    >
      {renderContent()}

      {isBot && isExportableContent(message.text) && (
        <ExportButton content={message.text} title="Plan de Nutrición" />
      )}
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
  table: {
    minWidth: 300,
  },
  tableRow: {
    flexDirection: "row",
    minHeight: 40,
  },
  tableCell: {
    minWidth: 100,
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  tableHeader: {
    paddingVertical: 12,
  },
  tableCellText: {
    fontSize: 12,
    textAlign: "center",
  },
  tableHeaderText: {
    fontSize: 13,
    fontWeight: "bold",
  },
  scrollHint: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
    fontStyle: "italic",
  },
});
