import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import { useTheme } from "../../../contexts/ThemeContext";
import { withOpacity } from "../../../utils/themeStyles";
import type { NutritionQuotaBadge as QuotaBadge } from "../nutritionChatCopy";

type Props = {
  badge: QuotaBadge;
  onPress?: () => void;
  compact?: boolean;
};

export function NutritionChatQuotaBadge({
  badge,
  onPress,
  compact = false,
}: Props) {
  const { theme, isDark } = useTheme();

  const warnFg = isDark ? "#0F172A" : "#FEF3C7";
  const warnBg = isDark
    ? withOpacity("#FBBF24", 88)
    : withOpacity("#FBBF24", 28);
  const warnBorder = isDark
    ? withOpacity("#FBBF24", 100)
    : withOpacity("#FBBF24", 60);

  const palette =
    badge.tone === "exhausted" || badge.tone === "low"
      ? {
          backgroundColor: warnBg,
          borderColor: warnBorder,
          color: warnFg,
        }
      : {
          backgroundColor: withOpacity(theme.onPrimary, 18),
          borderColor: withOpacity(theme.onPrimary, 40),
          color: theme.onPrimary,
        };

  const content = (
    <View
      style={[
        styles.badge,
        compact && styles.badgeCompact,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
        },
      ]}
    >
      <Text style={[styles.label, { color: palette.color }]} numberOfLines={1}>
        {badge.label}
      </Text>
      {onPress ? (
        <Text style={[styles.cta, { color: palette.color }]} numberOfLines={1}>
          {badge.tone === "ok" ? "Premium ›" : "Ver Premium ›"}
        </Text>
      ) : null}
    </View>
  );

  if (!onPress) {
    return (
      <View accessibilityRole="text" accessibilityLabel={badge.label}>
        {content}
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${badge.label}. Ver planes Premium`}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  badgeCompact: {
    marginTop: 0,
  },
  label: {
    flexShrink: 1,
    fontSize: RFValue(12),
    fontWeight: "700",
  },
  cta: {
    fontSize: RFValue(11),
    fontWeight: "600",
    opacity: 0.9,
  },
});
