import React, { useMemo } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import type { ProgressStats } from "../../../utils/statsHelpers";
import {
  formatKg,
  metricTileLabel,
  type ProgressMetric,
} from "../utils/exerciseProgressCopy";

type Props = {
  stats: ProgressStats;
  metric: ProgressMetric;
  onSelect: (metric: ProgressMetric) => void;
};

const METRICS: ProgressMetric[] = ["weight", "oneRm", "volume"];

function valueFor(metric: ProgressMetric, stats: ProgressStats): string {
  switch (metric) {
    case "oneRm":
      return formatKg(stats.best1RM);
    case "volume":
      return formatKg(stats.totalVolume);
    case "weight":
    default:
      return formatKg(stats.bestWeight);
  }
}

export function ExerciseMetricSummaryRow({
  stats,
  metric,
  onSelect,
}: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.row}>
      {METRICS.map((item) => {
        const active = item === metric;
        return (
          <TouchableOpacity
            key={item}
            style={[styles.tile, active && styles.tileActive]}
            onPress={() => onSelect(item)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={metricTileLabel(item)}
          >
            <Text
              style={[styles.label, active && styles.labelActive]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {metricTileLabel(item)}
            </Text>
            <Text
              style={[styles.value, active && styles.valueActive]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {valueFor(item, stats)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      gap: 8,
    },
    tile: {
      flex: 1,
      minWidth: 0,
      backgroundColor: theme.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 8,
      paddingVertical: 10,
      gap: 4,
    },
    tileActive: {
      borderColor: theme.primary,
      backgroundColor: theme.surfaceElevated ?? theme.card,
    },
    label: {
      color: theme.textSecondary,
      fontSize: 11,
      fontWeight: "600",
    },
    labelActive: {
      color: theme.primary,
    },
    value: {
      color: theme.text,
      fontSize: 15,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
    },
    valueActive: {
      color: theme.text,
    },
  });
