import { Ionicons } from "@expo/vector-icons";
import { Crown } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import { useTheme } from "../../../contexts/ThemeContext";
import { withOpacity } from "../../../utils/themeStyles";
import { HealthDisclaimerCard } from "../../common/components/HealthDisclaimerCard";
import {
  NUTRITION_CHAT_TITLE,
  nutritionChatRoleLine,
  type NutritionQuotaBadge as QuotaBadge,
} from "../nutritionChatCopy";
import { NutritionChatQuotaBadge } from "./NutritionChatQuotaBadge";

type Props = {
  quotaBadge: QuotaBadge | null;
  showCrown: boolean;
  onPressPlans: () => void;
};

export function NutritionChatHeader({
  quotaBadge,
  showCrown,
  onPressPlans,
}: Props) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: theme.primary,
          shadowColor: theme.primary,
        },
      ]}
    >
      <View style={styles.row}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: withOpacity(theme.onPrimary, 18) },
          ]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Ionicons name="sparkles" size={20} color={theme.onPrimary} />
        </View>

        <View style={styles.identity}>
          <Text
            style={[styles.title, { color: theme.onPrimary }]}
            numberOfLines={1}
          >
            {NUTRITION_CHAT_TITLE}
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: withOpacity(theme.onPrimary, 78) },
            ]}
            numberOfLines={1}
          >
            {nutritionChatRoleLine()}
          </Text>
        </View>

        <View style={styles.actions}>
          {showCrown ? (
            <TouchableOpacity
              style={styles.hit}
              onPress={onPressPlans}
              accessibilityRole="button"
              accessibilityLabel="Actualizar a Premium"
            >
              <Crown size={20} color="#FBBF24" />
            </TouchableOpacity>
          ) : null}
          <View style={styles.hit}>
            <HealthDisclaimerCard
              variant="icon"
              iconColor={theme.onPrimary}
              iconSize={22}
            />
          </View>
        </View>
      </View>

      {quotaBadge ? (
        <View style={styles.quotaRow}>
          <NutritionChatQuotaBadge
            badge={quotaBadge}
            onPress={onPressPlans}
            compact
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  identity: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  title: {
    fontSize: RFValue(18),
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: RFValue(12),
    marginTop: 1,
    fontWeight: "500",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 4,
  },
  hit: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  quotaRow: {
    marginTop: 10,
  },
});
