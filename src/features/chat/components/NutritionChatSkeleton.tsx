import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import {
  Bone,
  SkeletonRoot,
  skeletonBoneColor,
} from "../../common/skeleton";

type NutritionChatSkeletonProps = {
  message?: string;
};

export function NutritionChatSkeleton({
  message = "Cargando nutrición...",
}: NutritionChatSkeletonProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const onPrimary = skeletonBoneColor(theme, "onPrimary");
  const onCard = skeletonBoneColor(theme, "card");

  return (
    <SkeletonRoot style={styles.root} message={message} messagePosition="below">
      <View style={styles.header}>
        <Bone style={[styles.headerIcon, { backgroundColor: onPrimary }]} />
        <View style={styles.headerTitles}>
          <Bone style={[styles.headerTitle, { backgroundColor: onPrimary }]} />
          <Bone
            style={[styles.headerSubtitle, { backgroundColor: onPrimary }]}
          />
        </View>
        <Bone style={[styles.headerIcon, { backgroundColor: onPrimary }]} />
      </View>

      <Bone style={[styles.banner, { backgroundColor: onCard }]} />

      <View style={styles.messages}>
        <Bone style={[styles.bubbleLeft, { backgroundColor: onCard }]} />
        <Bone style={[styles.bubbleRight, { backgroundColor: onCard }]} />
        <Bone style={[styles.bubbleLeftWide, { backgroundColor: onCard }]} />
      </View>

      <View style={styles.composer}>
        <Bone style={[styles.composerIcon, { backgroundColor: onCard }]} />
        <Bone style={[styles.composerInput, { backgroundColor: onCard }]} />
        <Bone style={[styles.composerIcon, { backgroundColor: onCard }]} />
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
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    headerIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    headerTitles: {
      flex: 1,
      gap: 6,
    },
    headerTitle: {
      width: "55%",
      height: 14,
      borderRadius: 6,
    },
    headerSubtitle: {
      width: "35%",
      height: 10,
      borderRadius: 5,
    },
    banner: {
      marginHorizontal: 16,
      marginTop: 12,
      height: 44,
      borderRadius: 12,
    },
    messages: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 16,
      gap: 12,
    },
    bubbleLeft: {
      alignSelf: "flex-start",
      width: "55%",
      height: 48,
      borderRadius: 16,
    },
    bubbleRight: {
      alignSelf: "flex-end",
      width: "70%",
      height: 64,
      borderRadius: 16,
    },
    bubbleLeftWide: {
      alignSelf: "flex-start",
      width: "62%",
      height: 56,
      borderRadius: 16,
    },
    composer: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      backgroundColor: theme.card,
    },
    composerIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    composerInput: {
      flex: 1,
      height: 44,
      borderRadius: 22,
    },
  });
