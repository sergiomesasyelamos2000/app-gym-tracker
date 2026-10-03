import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Check, X } from "lucide-react-native";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import { useResponsive } from "../../../hooks/useResponsive";
import {
  subscriptionTypeScale,
  type SubscriptionTypeScale,
} from "../subscriptionLayout";

interface FeatureListProps {
  features: string[];
  showLimited?: boolean;
  limitedFeatures?: string[];
}

export function FeatureList({
  features,
  showLimited,
  limitedFeatures = [],
}: FeatureListProps) {
  const { theme } = useTheme();
  const { isSmallPhone } = useResponsive();
  const type = useMemo(
    () => subscriptionTypeScale(isSmallPhone),
    [isSmallPhone]
  );
  const styles = useMemo(() => createStyles(theme, type), [theme, type]);

  return (
    <View style={styles.container}>
      {features.map((feature, index) => (
        <View key={`available-${index}`} style={styles.featureRow}>
          <Check size={20} color={theme.success} style={styles.icon} />
          <Text style={styles.featureText}>{feature}</Text>
        </View>
      ))}

      {showLimited &&
        limitedFeatures.map((feature, index) => (
          <View key={`limited-${index}`} style={styles.featureRow}>
            <X size={20} color={theme.error} style={styles.icon} />
            <Text style={[styles.featureText, styles.limitedText]}>
              {feature}
            </Text>
          </View>
        ))}
    </View>
  );
}

const createStyles = (theme: Theme, type: SubscriptionTypeScale) =>
  StyleSheet.create({
    container: {
      paddingVertical: 8,
    },
    featureRow: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 8,
    },
    icon: {
      marginRight: 12,
    },
    featureText: {
      fontSize: type.feature,
      color: theme.text,
      flex: 1,
    },
    limitedText: {
      color: theme.textTertiary,
      textDecorationLine: "line-through",
    },
  });
