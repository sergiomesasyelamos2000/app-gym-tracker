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
            style={[styles.pill, index === 1 ? styles.pillActive : null]}
          />
        ))}
      </View>

      <Bone style={styles.heroLine} />
      <Bone style={styles.heroLineShort} />

      <View style={styles.tilesRow}>
        {[0, 1, 2].map((index) => (
          <View key={`tile-${index}`} style={styles.tile}>
            <Bone style={styles.tileLabel} />
            <Bone style={styles.tileValue} />
          </View>
        ))}
      </View>

      <View style={styles.chartCard}>
        <Bone style={styles.segment} />
        <Bone style={styles.chartPlot} />
        <Bone style={styles.caption} />
      </View>
    </SkeletonRoot>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 8,
      gap: 12,
    },
    pillsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    pill: {
      minWidth: 72,
      height: 32,
      borderRadius: 999,
      backgroundColor: theme.backgroundSecondary,
    },
    pillActive: {
      backgroundColor: theme.primary,
    },
    heroLine: {
      width: "88%",
      height: 18,
      borderRadius: 8,
      backgroundColor: theme.backgroundSecondary,
    },
    heroLineShort: {
      width: "55%",
      height: 18,
      borderRadius: 8,
      backgroundColor: theme.backgroundSecondary,
      marginTop: -4,
    },
    tilesRow: {
      flexDirection: "row",
      gap: 8,
    },
    tile: {
      flex: 1,
      backgroundColor: theme.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 10,
      gap: 8,
    },
    tileLabel: {
      width: "70%",
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.backgroundSecondary,
    },
    tileValue: {
      width: "55%",
      height: 16,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
    },
    chartCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 12,
      gap: 12,
    },
    segment: {
      width: "100%",
      height: 36,
      borderRadius: 10,
      backgroundColor: theme.backgroundSecondary,
    },
    chartPlot: {
      width: "100%",
      height: 180,
      borderRadius: 12,
      backgroundColor: theme.backgroundSecondary,
    },
    caption: {
      width: "45%",
      height: 12,
      borderRadius: 6,
      alignSelf: "center",
      backgroundColor: theme.backgroundSecondary,
    },
  });
