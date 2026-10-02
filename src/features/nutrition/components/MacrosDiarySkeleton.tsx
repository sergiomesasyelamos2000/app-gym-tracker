import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import { Bone, SkeletonRoot } from "../../common/skeleton";

type MacrosDiarySkeletonProps = {
  message?: string;
};

const MEAL_SLOTS = [0, 1, 2, 3];

export function MacrosDiarySkeleton({
  message = "Cargando...",
}: MacrosDiarySkeletonProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SkeletonRoot style={styles.root} message={message}>
      <View style={styles.headerRow}>
        <View style={styles.headerTitles}>
          <Bone style={styles.headerTitle} />
          <Bone style={styles.headerDate} />
        </View>
        <View style={styles.headerIcons}>
          {[0, 1, 2, 3, 4].map((index) => (
            <Bone key={`icon-${index}`} style={styles.headerIcon} />
          ))}
        </View>
      </View>

      <View style={styles.calorieCard}>
        <Bone style={styles.calorieLabel} />
        <Bone style={styles.calorieValue} />
        <Bone style={styles.calorieSub} />
        <View style={styles.calorieCols}>
          {[0, 1, 2].map((index) => (
            <Bone key={`cal-col-${index}`} style={styles.calorieCol} />
          ))}
        </View>
        <Bone style={styles.progressTrack} />
      </View>

      <View style={styles.macroCard}>
        <Bone style={styles.macroTitle} />
        <View style={styles.macroRings}>
          {[0, 1, 2].map((index) => (
            <View key={`ring-${index}`} style={styles.macroRingCol}>
              <Bone style={styles.macroRing} />
              <Bone style={styles.macroCaption} />
            </View>
          ))}
        </View>
      </View>

      <Bone style={styles.diaryTitle} />

      {MEAL_SLOTS.map((index) => (
        <View key={`meal-${index}`} style={styles.mealRow}>
          <Bone style={styles.mealIcon} />
          <View style={styles.mealBody}>
            <Bone style={styles.mealTitle} />
            <Bone style={styles.mealSub} />
          </View>
          <Bone style={styles.mealKcal} />
          <Bone style={styles.mealChevron} />
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
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
      gap: 12,
    },
    headerTitles: {
      flex: 1,
      gap: 8,
    },
    headerTitle: {
      width: "55%",
      height: 18,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
    },
    headerDate: {
      width: "40%",
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
    },
    headerIcons: {
      flexDirection: "row",
      gap: 8,
    },
    headerIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.backgroundSecondary,
    },
    calorieCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
      marginBottom: 12,
    },
    calorieLabel: {
      width: "30%",
      height: 11,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
      marginBottom: 8,
    },
    calorieValue: {
      width: 72,
      height: 28,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
      marginBottom: 6,
    },
    calorieSub: {
      width: "50%",
      height: 11,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
      marginBottom: 14,
    },
    calorieCols: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 14,
    },
    calorieCol: {
      flex: 1,
      height: 36,
      borderRadius: 8,
      backgroundColor: theme.backgroundSecondary,
    },
    progressTrack: {
      width: "100%",
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.backgroundSecondary,
    },
    macroCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
      marginBottom: 16,
    },
    macroTitle: {
      width: "45%",
      height: 14,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
      marginBottom: 16,
    },
    macroRings: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    macroRingCol: {
      alignItems: "center",
      gap: 10,
    },
    macroRing: {
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: theme.backgroundSecondary,
    },
    macroCaption: {
      width: 48,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.backgroundSecondary,
    },
    diaryTitle: {
      width: "50%",
      height: 16,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
      marginBottom: 12,
    },
    mealRow: {
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
    mealIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.backgroundSecondary,
    },
    mealBody: {
      flex: 1,
      gap: 6,
    },
    mealTitle: {
      width: "55%",
      height: 13,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
    },
    mealSub: {
      width: "35%",
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.backgroundSecondary,
    },
    mealKcal: {
      width: 40,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
    },
    mealChevron: {
      width: 12,
      height: 12,
      borderRadius: 4,
      backgroundColor: theme.backgroundSecondary,
    },
  });
