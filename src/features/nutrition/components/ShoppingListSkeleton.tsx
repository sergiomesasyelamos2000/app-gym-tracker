import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import { Bone, SkeletonRoot } from "../../common/skeleton";

type ShoppingListSkeletonProps = {
  rowCount?: number;
};

export function ShoppingListSkeleton({
  rowCount = 5,
}: ShoppingListSkeletonProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SkeletonRoot style={styles.root}>
      <View style={styles.statsRow}>
        {[0, 1, 2].map((index) => (
          <Bone key={`stat-${index}`} style={styles.statChip} />
        ))}
      </View>

      {Array.from({ length: rowCount }).map((_, index) => (
        <View key={`row-${index}`} style={styles.row}>
          <Bone style={styles.checkbox} />
          <Bone style={styles.thumb} />
          <Bone style={styles.title} />
          <Bone style={styles.trash} />
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
    statsRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 16,
    },
    statChip: {
      flex: 1,
      height: 56,
      borderRadius: 12,
      backgroundColor: theme.backgroundSecondary,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 12,
      marginBottom: 10,
      gap: 10,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
    },
    thumb: {
      width: 48,
      height: 48,
      borderRadius: 10,
      backgroundColor: theme.backgroundSecondary,
    },
    title: {
      flex: 1,
      height: 14,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
    },
    trash: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.backgroundSecondary,
    },
  });
