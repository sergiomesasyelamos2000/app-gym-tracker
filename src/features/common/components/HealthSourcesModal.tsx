import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import {
  HEALTH_DISCLAIMER,
  HEALTH_SOURCES,
} from "../constants/healthDisclaimer";
import { openExternalUrl } from "../utils/openExternalUrl";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function HealthSourcesModal({ visible, onClose }: Props) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>
              {HEALTH_DISCLAIMER.title}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            <Text style={[styles.summary, { color: theme.textSecondary }]}>
              {HEALTH_DISCLAIMER.summary}
            </Text>
            <Text style={[styles.consult, { color: theme.textSecondary }]}>
              {HEALTH_DISCLAIMER.consultProfessional}
            </Text>

            <Text style={[styles.sourcesTitle, { color: theme.text }]}>
              Fuentes
            </Text>

            {HEALTH_SOURCES.map((source) => (
              <TouchableOpacity
                key={source.id}
                style={[
                  styles.sourceRow,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => openExternalUrl(source.url)}
              >
                <View style={styles.sourceContent}>
                  <Text style={[styles.sourceLabel, { color: theme.text }]}>
                    {source.label}
                  </Text>
                  <Text
                    style={[styles.sourceCitation, { color: theme.primary }]}
                  >
                    {source.citation}
                  </Text>
                </View>
                <Ionicons
                  name="open-outline"
                  size={18}
                  color={theme.primary}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      padding: 20,
    },
    card: {
      borderRadius: 16,
      maxHeight: "85%",
      padding: 20,
      borderWidth: 1,
      borderColor: theme.border,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      flex: 1,
      marginRight: 12,
    },
    content: {
      paddingBottom: 4,
    },
    summary: {
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 8,
    },
    consult: {
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 16,
    },
    sourcesTitle: {
      fontSize: 15,
      fontWeight: "700",
      marginBottom: 10,
    },
    sourceRow: {
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 8,
    },
    sourceContent: {
      flex: 1,
      marginRight: 8,
    },
    sourceLabel: {
      fontSize: 14,
      fontWeight: "600",
      marginBottom: 2,
    },
    sourceCitation: {
      fontSize: 13,
    },
  });
