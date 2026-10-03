import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import { withOpacity } from "../../../utils/themeStyles";
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
  const onPrimaryBone = withOpacity(theme.onPrimary, 28);
  const onCard = skeletonBoneColor(theme, "card");

  return (
    <SkeletonRoot style={styles.root} message={message} messagePosition="below">
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <Bone style={[styles.avatar, { backgroundColor: onPrimaryBone }]} />
        <View style={styles.headerTitles}>
          <Bone style={[styles.headerTitle, { backgroundColor: onPrimaryBone }]} />
          <Bone
            style={[styles.headerSubtitle, { backgroundColor: onPrimaryBone }]}
          />
        </View>
        <Bone style={[styles.headerIcon, { backgroundColor: onPrimaryBone }]} />
      </View>

      <View style={styles.messages}>
        <Bone style={[styles.bubbleLeft, { backgroundColor: onCard }]} />
        <Bone style={[styles.bubbleRight, { backgroundColor: onCard }]} />
        <Bone style={[styles.bubbleLeftWide, { backgroundColor: onCard }]} />
      </View>

      <View style={styles.composer}>
        <Bone style={[styles.composerInput, { backgroundColor: onCard }]} />
        <Bone style={[styles.composerIcon, { backgroundColor: onCard }]} />
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
      flexDirection: "row",
      alignItems: "center",
      minHeight: 68,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      marginRight: 12,
    },
    headerIcon: {
      width: 22,
      height: 22,
      borderRadius: 11,
    },
    headerTitles: {
      flex: 1,
      gap: 8,
      paddingRight: 12,
    },
    headerTitle: {
      width: "40%",
      height: 16,
      borderRadius: 6,
    },
    headerSubtitle: {
      width: "55%",
      height: 10,
      borderRadius: 5,
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
      gap: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
      backgroundColor: theme.background,
    },
    composerIcon: {
      width: 44,
      height: 44,
      borderRadius: 16,
    },
    composerInput: {
      flex: 1,
      height: 44,
      borderRadius: 16,
    },
  });
