import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import { Bone, SkeletonRoot } from "../../common/skeleton";

type RoutineDetailSkeletonProps = {
  cardCount?: number;
  setsPerCard?: number;
  message?: string;
};

export function RoutineDetailSkeleton({
  cardCount = 2,
  setsPerCard = 3,
  message = "Cargando ejercicios...",
}: RoutineDetailSkeletonProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SkeletonRoot style={styles.root} message={message}>
      {Array.from({ length: cardCount }).map((_, cardIndex) => (
        <View key={`card-${cardIndex}`} style={styles.card}>
          <View style={styles.cardHeader}>
            <Bone style={styles.thumb} />
            <View style={styles.cardTitles}>
              <Bone style={styles.title} />
              <Bone style={styles.subtitle} />
            </View>
            <Bone style={styles.overflow} />
          </View>

          {Array.from({ length: setsPerCard }).map((_, setIndex) => (
            <View key={`set-${setIndex}`} style={styles.setRow}>
              <Bone style={styles.setChip} />
              <Bone style={styles.setInput} />
              <Bone style={styles.setInput} />
              <Bone style={styles.setCheck} />
            </View>
          ))}
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
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
      gap: 10,
    },
    thumb: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: theme.backgroundSecondary,
    },
    cardTitles: {
      flex: 1,
      gap: 6,
    },
    title: {
      width: "70%",
      height: 14,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
    },
    subtitle: {
      width: "40%",
      height: 11,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
    },
    overflow: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.backgroundSecondary,
    },
    setRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
    },
    setChip: {
      width: 28,
      height: 22,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
    },
    setInput: {
      flex: 1,
      height: 34,
      borderRadius: 8,
      backgroundColor: theme.backgroundSecondary,
    },
    setCheck: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.backgroundSecondary,
    },
  });
