import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import { Bone, SkeletonRoot } from "../../common/skeleton";
import {
  SUBSCRIPTION_SECTION_GAP,
  subscriptionColumnStyle,
} from "../subscriptionLayout";

const MESSAGE = "Cargando pago seguro…";

export function CheckoutSkeleton() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SkeletonRoot
      style={styles.root}
      message={MESSAGE}
      messagePosition="below"
    >
      <Bone style={styles.amount} />
      <Bone style={styles.amountMeta} />

      {[0, 1].map((index) => (
        <View key={`field-${index}`} style={styles.field}>
          <Bone style={styles.label} />
          <Bone style={styles.input} />
        </View>
      ))}

      <View style={styles.splitRow}>
        <View style={styles.splitField}>
          <Bone style={styles.label} />
          <Bone style={styles.input} />
        </View>
        <View style={styles.splitField}>
          <Bone style={styles.label} />
          <Bone style={styles.input} />
        </View>
      </View>

      <Bone style={styles.payButton} />
    </SkeletonRoot>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      ...subscriptionColumnStyle(),
      paddingTop: SUBSCRIPTION_SECTION_GAP,
      flex: 1,
    },
    amount: {
      width: "42%",
      height: 28,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
      marginBottom: 8,
    },
    amountMeta: {
      width: "28%",
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
      marginBottom: 28,
    },
    field: {
      marginBottom: 16,
    },
    label: {
      width: "36%",
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
      marginBottom: 8,
    },
    input: {
      width: "100%",
      height: 48,
      borderRadius: 8,
      backgroundColor: theme.backgroundSecondary,
    },
    splitRow: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 24,
    },
    splitField: {
      flex: 1,
    },
    payButton: {
      width: "100%",
      height: 48,
      borderRadius: 12,
      backgroundColor: theme.primary,
      marginBottom: 16,
    },
  });
