import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Theme, useTheme } from "../../../../contexts/ThemeContext";
import { Bone, SkeletonRoot } from "../../../common/skeleton";

type NutritionPlanDetailSkeletonProps = {
  dayCount?: number;
  mealsInFirstDay?: number;
  message?: string;
};

export function NutritionPlanDetailSkeleton({
  dayCount = 2,
  mealsInFirstDay = 2,
  message = "Cargando plan...",
}: NutritionPlanDetailSkeletonProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SkeletonRoot style={styles.root} message={message}>
      <View style={styles.summaryCard}>
        <Bone style={styles.title} />
        <Bone style={styles.meta} />
        <Bone style={styles.badge} />
        <Bone style={styles.desc} />
        <Bone style={styles.descShort} />
        <Bone style={styles.avgLabel} />
        <View style={styles.macroRow}>
          {[0, 1, 2, 3].map((index) => (
            <Bone key={`m1-${index}`} style={styles.macroTile} />
          ))}
        </View>
        <View style={styles.macroRow}>
          {[0, 1, 2, 3].map((index) => (
            <Bone key={`m2-${index}`} style={styles.macroTile} />
          ))}
        </View>
      </View>

      <Bone style={styles.actionButton} />
      <Bone style={styles.daysTitle} />

      {Array.from({ length: dayCount }).map((_, dayIndex) => (
        <View key={`day-${dayIndex}`} style={styles.dayBlock}>
          <View style={styles.dayHeader}>
            <Bone style={styles.dayLabel} />
            <Bone style={styles.dayBadge} />
            <Bone style={styles.dayBadge} />
          </View>
          {dayIndex === 0
            ? Array.from({ length: mealsInFirstDay }).map((_, mealIndex) => (
                <View key={`meal-${mealIndex}`} style={styles.mealCard}>
                  <Bone style={styles.mealTitle} />
                  <View style={styles.macroRow}>
                    {[0, 1, 2, 3].map((macro) => (
                      <Bone key={`mm-${macro}`} style={styles.mealMacro} />
                    ))}
                  </View>
                </View>
              ))
            : null}
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
    summaryCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 14,
      marginBottom: 12,
    },
    title: {
      width: "70%",
      height: 18,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
      marginBottom: 8,
    },
    meta: {
      width: "40%",
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
      marginBottom: 8,
    },
    badge: {
      width: 72,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.backgroundSecondary,
      marginBottom: 10,
    },
    desc: {
      width: "90%",
      height: 11,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
      marginBottom: 6,
    },
    descShort: {
      width: "60%",
      height: 11,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
      marginBottom: 12,
    },
    avgLabel: {
      width: "35%",
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
      marginBottom: 10,
    },
    macroRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 8,
    },
    macroTile: {
      flex: 1,
      height: 40,
      borderRadius: 10,
      backgroundColor: theme.backgroundSecondary,
    },
    actionButton: {
      width: "100%",
      height: 48,
      borderRadius: 12,
      backgroundColor: theme.primary,
      marginBottom: 16,
    },
    daysTitle: {
      width: "40%",
      height: 14,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
      marginBottom: 12,
    },
    dayBlock: {
      marginBottom: 12,
    },
    dayHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: theme.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 12,
      marginBottom: 8,
    },
    dayLabel: {
      flex: 1,
      height: 14,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
    },
    dayBadge: {
      width: 48,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.backgroundSecondary,
    },
    mealCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 12,
      marginBottom: 8,
      marginLeft: 8,
    },
    mealTitle: {
      width: "55%",
      height: 13,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
      marginBottom: 10,
    },
    mealMacro: {
      flex: 1,
      height: 28,
      borderRadius: 8,
      backgroundColor: theme.backgroundSecondary,
    },
  });
