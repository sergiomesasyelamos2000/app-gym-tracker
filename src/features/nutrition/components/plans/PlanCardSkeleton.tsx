import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Theme, useTheme } from "../../../../contexts/ThemeContext";
import { Bone, SkeletonRoot } from "../../../common/skeleton";

type PlanCardSkeletonProps = {
  count?: number;
};

export function PlanCardSkeleton({ count = 3 }: PlanCardSkeletonProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SkeletonRoot style={styles.root}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={`plan-${index}`} style={styles.card}>
          <View style={styles.titleRow}>
            <Bone style={styles.title} />
            <Bone style={styles.badge} />
          </View>
          <Bone style={styles.subtitle} />
          <Bone style={styles.description} />
          <View style={styles.macroRow}>
            {[0, 1, 2, 3].map((macro) => (
              <Bone key={`macro-${macro}`} style={styles.macroTile} />
            ))}
          </View>
          <View style={styles.footer}>
            <Bone style={styles.footerLine} />
            <Bone style={styles.chevron} />
          </View>
        </View>
      ))}
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
      padding: 14,
      marginBottom: 12,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
      gap: 8,
    },
    title: {
      flex: 1,
      height: 16,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
    },
    badge: {
      width: 64,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.backgroundSecondary,
    },
    subtitle: {
      width: "45%",
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
      marginBottom: 8,
    },
    description: {
      width: "80%",
      height: 11,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
      marginBottom: 12,
    },
    macroRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 12,
    },
    macroTile: {
      flex: 1,
      height: 44,
      borderRadius: 10,
      backgroundColor: theme.backgroundSecondary,
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    footerLine: {
      width: "40%",
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
    },
    chevron: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: theme.backgroundSecondary,
    },
  });
