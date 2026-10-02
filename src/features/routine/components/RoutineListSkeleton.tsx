import React, { useMemo } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import { Bone, SkeletonRoot } from "../../common/skeleton";

/** Approx. folder row height including margin. */
export const ROUTINE_LIST_FOLDER_STRIDE = 70;
/** Approx. routine card height including margin. */
export const ROUTINE_LIST_CARD_STRIDE = 156;
/** Header chrome subtracted from window height (safe area + titles). */
export const ROUTINE_LIST_CHROME = 168;

export function getRoutineSkeletonCount(
  height: number,
  fallback = 4
): number {
  const available = Math.max(
    0,
    height - ROUTINE_LIST_CHROME - ROUTINE_LIST_FOLDER_STRIDE
  );
  const computed = Math.max(
    2,
    Math.min(4, Math.floor(available / ROUTINE_LIST_CARD_STRIDE))
  );
  return fallback > 0 ? Math.min(fallback, computed) : computed;
}

type RoutineListSkeletonProps = {
  /** Max routine cards before viewport clamp. Default 4. */
  count?: number;
  /** Folder rows to show. Default 1; clamped to 0 or 1. */
  folderCount?: number;
  message?: string;
};

type SharedSkeletonProps = {
  styles: ReturnType<typeof createStyles>;
};

function FolderRowSkeleton({ styles }: SharedSkeletonProps) {
  return (
    <View style={styles.folderCard}>
      <View style={styles.folderHeader}>
        <View style={styles.dragSlot}>
          <Bone style={styles.dragBone} />
        </View>
        <Bone style={styles.folderMark} />
        <View style={styles.folderTitleWrap}>
          <Bone style={styles.folderTitle} />
        </View>
        <Bone style={styles.folderCount} />
        <Bone style={styles.folderChevron} />
        <Bone style={styles.overflow} />
      </View>
    </View>
  );
}

function RoutineCardSkeleton({ styles }: SharedSkeletonProps) {
  return (
    <View style={styles.routineCard}>
      <View style={styles.cardTopRow}>
        <View style={styles.dragSlot}>
          <Bone style={styles.dragBone} />
        </View>
        <View style={styles.routineBody}>
          <Bone style={styles.routineTitle} />
          <Bone style={styles.previewLine1} />
          <Bone style={styles.previewLine2} />
        </View>
        <Bone style={styles.overflow} />
      </View>
      <Bone style={styles.startButton} />
    </View>
  );
}

export function RoutineListSkeleton({
  count,
  folderCount,
  message = "Cargando rutinas...",
}: RoutineListSkeletonProps) {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const { height } = useWindowDimensions();
  const rowCount = getRoutineSkeletonCount(height, count ?? 4);
  const folders = Math.max(0, Math.min(1, folderCount ?? 1));

  return (
    <SkeletonRoot style={styles.root} message={message}>
      {folders > 0 ? <FolderRowSkeleton styles={styles} /> : null}

      {Array.from({ length: rowCount }).map((_, index) => (
        <RoutineCardSkeleton key={`routine-sk-${index}`} styles={styles} />
      ))}
    </SkeletonRoot>
  );
}

const createStyles = (theme: Theme, isDark: boolean) =>
  StyleSheet.create({
    root: {
      width: "100%",
      alignSelf: "stretch",
      paddingTop: 4,
    },
    folderCard: {
      borderRadius: 14,
      borderWidth: 1.5,
      paddingVertical: 10,
      paddingHorizontal: 8,
      marginBottom: 10,
      backgroundColor: isDark ? theme.surfaceElevated : theme.card,
      borderColor: theme.border,
    },
    folderHeader: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 40,
      gap: 8,
    },
    dragSlot: {
      width: 28,
      alignItems: "center",
      justifyContent: "center",
    },
    dragBone: {
      width: 18,
      height: 14,
      borderRadius: 4,
      backgroundColor: theme.backgroundSecondary,
    },
    folderMark: {
      width: 22,
      height: 22,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
    },
    folderTitleWrap: {
      flex: 1,
      minWidth: 0,
    },
    folderTitle: {
      width: "52%",
      height: 14,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
    },
    folderCount: {
      width: 24,
      height: 24,
      borderRadius: 8,
      backgroundColor: theme.backgroundSecondary,
    },
    folderChevron: {
      width: 12,
      height: 12,
      borderRadius: 4,
      backgroundColor: theme.backgroundSecondary,
    },
    overflow: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.backgroundSecondary,
    },
    routineCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
      marginBottom: 12,
    },
    cardTopRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 4,
    },
    routineBody: {
      flex: 1,
      minWidth: 0,
      paddingRight: 4,
    },
    routineTitle: {
      width: "72%",
      height: 16,
      borderRadius: 6,
      backgroundColor: theme.backgroundSecondary,
    },
    previewLine1: {
      width: "92%",
      height: 12,
      borderRadius: 6,
      marginTop: 8,
      backgroundColor: theme.backgroundSecondary,
    },
    previewLine2: {
      width: "64%",
      height: 12,
      borderRadius: 6,
      marginTop: 6,
      backgroundColor: theme.backgroundSecondary,
    },
    startButton: {
      marginTop: 14,
      height: 44,
      borderRadius: 12,
      width: "100%",
      backgroundColor: theme.primary,
    },
  });
