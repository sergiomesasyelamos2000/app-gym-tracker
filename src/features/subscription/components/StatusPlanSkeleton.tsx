import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import { Bone, SkeletonRoot } from "../../common/skeleton";

export function StatusPlanSkeleton() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SkeletonRoot style={styles.root}>
      <View style={styles.card}>
        <View style={styles.titleRow}>
          <Bone style={styles.planName} />
          <Bone style={styles.badge} />
        </View>
        <Bone style={styles.desc} />
        <Bone style={styles.descShort} />

        {[0, 1].map((index) => (
          <View key={`row-${index}`} style={styles.detailRow}>
            <Bone style={styles.detailIcon} />
            <Bone style={styles.detailLabel} />
            <Bone style={styles.detailValue} />
          </View>
        ))}

        <Bone style={styles.featuresTitle} />
        {[0, 1, 2, 3].map((index) => (
          <Bone key={`feat-${index}`} style={styles.featureLine} />
        ))}
      </View>

      <Bone style={styles.button} />
      <Bone style={styles.buttonSecondary} />
    </SkeletonRoot>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
      marginBottom: 16,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
      gap: 8,
    },
    planName: {
      flex: 1,
      height: 18,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
    },
    badge: {
      width: 72,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.backgroundSecondary,
    },
    desc: {
      width: "90%",
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
      marginBottom: 6,
    },
    descShort: {
      width: "60%",
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
      marginBottom: 16,
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 12,
    },
    detailIcon: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.backgroundSecondary,
    },
    detailLabel: {
      flex: 1,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
    },
    detailValue: {
      width: 72,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
    },
    featuresTitle: {
      width: "45%",
      height: 14,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
      marginTop: 8,
      marginBottom: 12,
    },
    featureLine: {
      width: "85%",
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
      marginBottom: 8,
    },
    button: {
      width: "100%",
      height: 48,
      borderRadius: 12,
      backgroundColor: theme.primary,
      marginBottom: 10,
    },
    buttonSecondary: {
      width: "100%",
      height: 48,
      borderRadius: 12,
      backgroundColor: theme.backgroundSecondary,
    },
  });
