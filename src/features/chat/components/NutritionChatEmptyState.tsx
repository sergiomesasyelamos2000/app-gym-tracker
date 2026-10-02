import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import { withOpacity } from "../../../utils/themeStyles";
import {
  NUTRITION_CHAT_CHIPS,
  NUTRITION_CHAT_EMPTY_LINE,
} from "../nutritionChatCopy";

type Props = {
  onSendPrompt: (text: string) => void;
  onPickPhoto: () => void;
  disabled?: boolean;
};

const CHIP_ICONS: Record<
  (typeof NUTRITION_CHAT_CHIPS)[number]["id"],
  keyof typeof Ionicons.glyphMap
> = {
  "diet-plan": "restaurant-outline",
  macros: "pie-chart-outline",
  "analyze-food": "camera-outline",
};

export function NutritionChatEmptyState({
  onSendPrompt,
  onPickPhoto,
  disabled = false,
}: Props) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconBadge,
          { backgroundColor: withOpacity(theme.primary, 12) },
        ]}
      >
        <Ionicons name="nutrition" size={26} color={theme.primary} />
      </View>
      <Text style={[styles.line, { color: theme.textSecondary }]}>
        {NUTRITION_CHAT_EMPTY_LINE}
      </Text>
      <View style={styles.chips}>
        {NUTRITION_CHAT_CHIPS.map((chip) => (
          <TouchableOpacity
            key={chip.id}
            style={[
              styles.chip,
              {
                backgroundColor: withOpacity(theme.primary, 8),
                borderColor: withOpacity(theme.primary, 22),
              },
            ]}
            disabled={disabled}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={chip.label}
            onPress={() => {
              if (chip.prompt) {
                onSendPrompt(chip.prompt);
                return;
              }
              onPickPhoto();
            }}
          >
            <Ionicons
              name={CHIP_ICONS[chip.id]}
              size={20}
              color={theme.primary}
            />
            <Text style={[styles.chipText, { color: theme.primary }]}>
              {chip.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const createStyles = (_theme: Theme) =>
  StyleSheet.create({
    container: {
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 24,
      paddingBottom: 12,
    },
    iconBadge: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14,
    },
    line: {
      fontSize: RFValue(15),
      textAlign: "center",
      lineHeight: RFValue(22),
      marginBottom: 18,
    },
    chips: {
      width: "100%",
      gap: 10,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    chipText: {
      fontSize: RFValue(15),
      fontWeight: "700",
    },
  });
