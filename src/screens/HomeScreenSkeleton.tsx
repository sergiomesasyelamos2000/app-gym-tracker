import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Theme, useTheme } from "../contexts/ThemeContext";
import {
  Bone,
  SkeletonRoot,
  skeletonBoneColor,
} from "../features/common/skeleton";

type HomeScreenSkeletonProps = {
  sessionCount?: number;
  message?: string;
};

export function HomeScreenSkeleton({
  sessionCount = 2,
  message = "Cargando datos...",
}: HomeScreenSkeletonProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const onPrimary = skeletonBoneColor(theme, "onPrimary");
  const onCard = skeletonBoneColor(theme, "card");

  return (
    <SkeletonRoot style={styles.root} message={message} messagePosition="below">
      <View style={styles.header}>
        <Bone style={[styles.greeting, { backgroundColor: onPrimary }]} />
        <Bone style={[styles.name, { backgroundColor: onPrimary }]} />
        <Bone style={[styles.quote, { backgroundColor: onPrimary }]} />
        <View style={styles.clockRow}>
          <Bone style={[styles.clockPill, { backgroundColor: onPrimary }]} />
        </View>
        <View style={styles.statsRow}>
          {[0, 1, 2].map((index) => (
            <View key={`stat-${index}`} style={styles.statCol}>
              <Bone
                style={[styles.statValue, { backgroundColor: onPrimary }]}
              />
              <Bone
                style={[styles.statLabel, { backgroundColor: onPrimary }]}
              />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.actionCard}>
          <Bone style={[styles.actionIcon, { backgroundColor: onCard }]} />
          <View style={styles.actionBody}>
            <Bone style={[styles.actionTitle, { backgroundColor: onCard }]} />
            <Bone
              style={[styles.actionSubtitle, { backgroundColor: onCard }]}
            />
          </View>
          <Bone style={[styles.actionArrow, { backgroundColor: onCard }]} />
        </View>

        <Bone style={[styles.sectionTitle, { backgroundColor: onCard }]} />

        {Array.from({ length: sessionCount }).map((_, index) => (
          <View key={`session-${index}`} style={styles.sessionCard}>
            <Bone style={[styles.sessionDate, { backgroundColor: onCard }]} />
            <Bone style={[styles.sessionTitle, { backgroundColor: onCard }]} />
            <View style={styles.sessionChips}>
              {[0, 1, 2].map((chip) => (
                <Bone
                  key={`chip-${chip}`}
                  style={[styles.sessionChip, { backgroundColor: onCard }]}
                />
              ))}
            </View>
          </View>
        ))}
      </View>
    </SkeletonRoot>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.backgroundSecondary,
    },
    header: {
      backgroundColor: theme.primary,
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 24,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    greeting: {
      width: "40%",
      height: 14,
      borderRadius: 6,
      marginBottom: 8,
    },
    name: {
      width: "55%",
      height: 22,
      borderRadius: 6,
      marginBottom: 10,
    },
    quote: {
      width: "80%",
      height: 12,
      borderRadius: 6,
      marginBottom: 16,
    },
    clockRow: {
      marginBottom: 20,
    },
    clockPill: {
      width: 120,
      height: 36,
      borderRadius: 18,
    },
    statsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    statCol: {
      flex: 1,
      alignItems: "center",
      gap: 8,
    },
    statValue: {
      width: 36,
      height: 20,
      borderRadius: 6,
    },
    statLabel: {
      width: 56,
      height: 10,
      borderRadius: 5,
    },
    body: {
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    actionCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 14,
      marginBottom: 20,
      gap: 12,
    },
    actionIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
    },
    actionBody: {
      flex: 1,
      gap: 8,
    },
    actionTitle: {
      width: "70%",
      height: 14,
      borderRadius: 6,
    },
    actionSubtitle: {
      width: "50%",
      height: 11,
      borderRadius: 6,
    },
    actionArrow: {
      width: 18,
      height: 18,
      borderRadius: 9,
    },
    sectionTitle: {
      width: "45%",
      height: 16,
      borderRadius: 6,
      marginBottom: 12,
    },
    sessionCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 14,
      marginBottom: 12,
    },
    sessionDate: {
      width: "35%",
      height: 11,
      borderRadius: 6,
      marginBottom: 8,
    },
    sessionTitle: {
      width: "70%",
      height: 15,
      borderRadius: 6,
      marginBottom: 12,
    },
    sessionChips: {
      flexDirection: "row",
      gap: 8,
    },
    sessionChip: {
      width: 64,
      height: 24,
      borderRadius: 12,
    },
  });
