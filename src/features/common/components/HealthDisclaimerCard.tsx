import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import {
  getHealthSourceById,
  getInlineHealthSourceIds,
  HEALTH_DISCLAIMER,
} from "../constants/healthDisclaimer";
import { openExternalUrl } from "../utils/openExternalUrl";
import { HealthSourcesModal } from "./HealthSourcesModal";

type Props = {
  variant?: "compact" | "inline";
  weightGoal?: "lose" | "gain" | "maintain";
  style?: object;
};

export function HealthDisclaimerCard({
  variant = "compact",
  weightGoal = "maintain",
  style,
}: Props) {
  const { theme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const inlineSourceIds = getInlineHealthSourceIds(weightGoal);

  return (
    <>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
          style,
        ]}
      >
        <View style={styles.headerRow}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={theme.info}
            style={styles.icon}
          />
          <Text style={[styles.summary, { color: theme.textSecondary }]}>
            {HEALTH_DISCLAIMER.summary}
          </Text>
        </View>

        {variant === "inline" ? (
          <View style={styles.inlineSources}>
            {inlineSourceIds.map((sourceId) => {
              const source = getHealthSourceById(sourceId);
              return (
                <TouchableOpacity
                  key={source.id}
                  onPress={() => openExternalUrl(source.url)}
                >
                  <Text style={[styles.inlineLink, { color: theme.primary }]}>
                    • {source.citation}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <Text style={[styles.action, { color: theme.primary }]}>
            {variant === "inline" ? "Ver todas las fuentes" : "Ver fuentes"}
          </Text>
        </TouchableOpacity>
      </View>

      <HealthSourcesModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      marginVertical: 8,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    icon: {
      marginRight: 8,
      marginTop: 1,
    },
    summary: {
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
    },
    inlineSources: {
      marginTop: 8,
      marginLeft: 28,
      gap: 4,
    },
    inlineLink: {
      fontSize: 13,
      lineHeight: 20,
      fontWeight: "600",
    },
    action: {
      marginTop: 8,
      marginLeft: 28,
      fontSize: 13,
      fontWeight: "700",
    },
  });
