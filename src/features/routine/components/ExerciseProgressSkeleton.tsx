import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import { Bone, SkeletonRoot } from "../../common/skeleton";

type ExerciseProgressSkeletonProps = {
  message?: string;
};

export function ExerciseProgressSkeleton({
  message = "Cargando datos...",
}: ExerciseProgressSkeletonProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SkeletonRoot style={styles.root} message={message}>
      <View style={styles.pillsRow}>
        {[0, 1, 2, 3].map((index) => (
          <Bone
            key={`pill-${index}`}
            style={[
              styles.pill,
              index === 0 ? styles.pillActive : null,
            ]}
          />
        ))}
      </View>
      <Bone style={styles.rangeLine} />

      <View style={styles.statsGrid}>
        {[0, 1, 2, 3].map((index) => (
          <View key={`stat-${index}`} style={styles.statTile}>
            <Bone style={styles.statValue} />
            <Bone style={styles.statLabel} />
          </View>
        ))}
      </View>

      {[0, 1, 2].map((index) => (
        <View key={`chart-${index}`} style={styles.chartCard}>
          <Bone style={styles.chartTitle} />
          <Bone style={styles.chartPlot} />
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
    pillsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 12,
    },
    pill: {
      minWidth: 84,
      height: 32,
      borderRadius: 999,
      backgroundColor: theme.backgroundSecondary,
    },
    pillActive: {
      backgroundColor: theme.primary,
    },
    rangeLine: {
      width: "55%",
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
      marginBottom: 16,
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: 16,
    },
    statTile: {
      width: "47%",
      backgroundColor: theme.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 12,
      gap: 8,
    },
    statValue: {
      width: "40%",
      height: 18,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
    },
    statLabel: {
      width: "60%",
      height: 11,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
    },
    chartCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 14,
      marginBottom: 12,
    },
    chartTitle: {
      width: "50%",
      height: 14,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
      marginBottom: 12,
    },
    chartPlot: {
      width: "100%",
      height: 160,
      borderRadius: 12,
      backgroundColor: theme.backgroundSecondary,
    },
  });
