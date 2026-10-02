import React, { useMemo } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import {
  Bone,
  SkeletonRoot,
  useOptionalSkeletonPulse,
} from "../../common/skeleton";
import { SkeletonPulseProvider } from "../../common/skeleton/SkeletonPulseContext";
import { useSkeletonPulse } from "../../common/skeleton/useSkeletonPulse";

type ExerciseMediaBoneProps = {
  width: number;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
};

function StandaloneMediaBone({
  width,
  height,
  borderRadius,
  style,
  theme,
}: ExerciseMediaBoneProps & { theme: Theme }) {
  const pulse = useSkeletonPulse();
  return (
    <SkeletonPulseProvider value={pulse}>
      <Bone
        style={[
          {
            width,
            height,
            borderRadius: borderRadius ?? 16,
            backgroundColor: theme.backgroundSecondary,
          },
          style,
        ]}
      />
    </SkeletonPulseProvider>
  );
}

/**
 * Media placeholder. Uses parent SkeletonRoot pulse when present;
 * otherwise starts its own pulse for use inside a loaded Header.
 */
export function ExerciseMediaBone(props: ExerciseMediaBoneProps) {
  const { theme } = useTheme();
  const parentPulse = useOptionalSkeletonPulse();
  const { width, height, borderRadius = 16, style } = props;

  if (parentPulse) {
    return (
      <Bone
        style={[
          {
            width,
            height,
            borderRadius,
            backgroundColor: theme.backgroundSecondary,
          },
          style,
        ]}
      />
    );
  }

  return <StandaloneMediaBone {...props} theme={theme} />;
}

type ExerciseDetailSkeletonProps = {
  historyCount?: number;
  message?: string;
  mediaWidth?: number;
  mediaHeight?: number;
};

export function ExerciseDetailSkeleton({
  historyCount = 2,
  message = "Cargando...",
  mediaWidth = 180,
  mediaHeight = 180,
}: ExerciseDetailSkeletonProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SkeletonRoot style={styles.root} message={message}>
      <View style={styles.mediaWrap}>
        <ExerciseMediaBone width={mediaWidth} height={mediaHeight} />
      </View>
      <Bone style={styles.nameLine} />
      <Bone style={styles.nameLineShort} />
      <Bone style={styles.musclePill} />

      <View style={styles.statsRow}>
        {[0, 1, 2].map((index) => (
          <View key={`stat-${index}`} style={styles.statTile}>
            <Bone style={styles.statValue} />
            <Bone style={styles.statLabel} />
          </View>
        ))}
      </View>

      <Bone style={styles.progressButton} />

      {Array.from({ length: historyCount }).map((_, index) => (
        <View key={`hist-${index}`} style={styles.historyCard}>
          <Bone style={styles.historyDate} />
          <Bone style={styles.historyTitle} />
          <Bone style={styles.historyMeta} />
          <Bone style={styles.historyMetaShort} />
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
    mediaWrap: {
      alignItems: "center",
      marginBottom: 16,
    },
    nameLine: {
      width: "75%",
      height: 18,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
      marginBottom: 8,
    },
    nameLineShort: {
      width: "45%",
      height: 14,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
      marginBottom: 10,
    },
    musclePill: {
      width: 96,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.backgroundSecondary,
      marginBottom: 16,
    },
    statsRow: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 16,
    },
    statTile: {
      flex: 1,
      backgroundColor: theme.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 12,
      alignItems: "center",
      gap: 8,
    },
    statValue: {
      width: 36,
      height: 16,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
    },
    statLabel: {
      width: 52,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.backgroundSecondary,
    },
    progressButton: {
      width: "100%",
      height: 64,
      borderRadius: 14,
      backgroundColor: theme.backgroundSecondary,
      marginBottom: 16,
    },
    historyCard: {
      backgroundColor: theme.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 14,
      marginBottom: 10,
    },
    historyDate: {
      width: "30%",
      height: 11,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
      marginBottom: 8,
    },
    historyTitle: {
      width: "65%",
      height: 14,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
      marginBottom: 10,
    },
    historyMeta: {
      width: "80%",
      height: 11,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
      marginBottom: 6,
    },
    historyMetaShort: {
      width: "45%",
      height: 11,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
    },
  });
