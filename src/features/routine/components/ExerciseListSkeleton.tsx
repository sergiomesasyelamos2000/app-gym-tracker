import React, { useMemo } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import { Bone, SkeletonRoot } from "../../common/skeleton";
import {
  EXERCISE_LIST_ROW_HEIGHT,
  EXERCISE_LIST_ROW_MARGIN_BOTTOM,
} from "./exerciseListLayout";

type Props = {
  count?: number;
  message?: string;
};

function getSkeletonCount(height: number, fallback: number): number {
  const rowApprox = EXERCISE_LIST_ROW_HEIGHT + EXERCISE_LIST_ROW_MARGIN_BOTTOM;
  const computed = Math.max(3, Math.min(7, Math.floor(height / rowApprox) - 1));
  return fallback > 0 ? Math.min(fallback, computed) : computed;
}

export function ExerciseListSkeleton({
  count,
  message = "Cargando ejercicios…",
}: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { height } = useWindowDimensions();
  const rowCount = getSkeletonCount(height, count ?? 6);

  return (
    <SkeletonRoot
      style={styles.root}
      message={message}
      messagePosition="below"
    >
      {Array.from({ length: rowCount }).map((_, index) => (
        <View key={`ex-sk-${index}`} style={styles.row}>
          <Bone style={styles.image} />
          <View style={styles.body}>
            <Bone style={[styles.line, styles.titleLine]} />
            <Bone style={[styles.line, styles.subtitleLine]} />
          </View>
          <Bone style={styles.trailing} />
        </View>
      ))}
    </SkeletonRoot>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      paddingTop: 4,
    },
    row: {
      height: EXERCISE_LIST_ROW_HEIGHT,
      marginBottom: EXERCISE_LIST_ROW_MARGIN_BOTTOM,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    image: {
      width: 72,
      height: 72,
      borderRadius: 12,
      marginRight: 12,
      backgroundColor: theme.backgroundSecondary,
    },
    body: {
      flex: 1,
      minWidth: 0,
      justifyContent: "center",
      gap: 8,
    },
    line: {
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
    },
    titleLine: {
      width: "78%",
      height: 14,
    },
    subtitleLine: {
      width: "42%",
      height: 11,
    },
    trailing: {
      width: 32,
      height: 32,
      borderRadius: 16,
      marginLeft: 8,
      backgroundColor: theme.backgroundSecondary,
    },
  });
