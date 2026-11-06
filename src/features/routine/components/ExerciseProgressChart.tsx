import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import type { ExerciseProgressDataPoint } from "../../../utils/statsHelpers";
import {
  formatKg,
  pointCaption,
  segmentLabel,
  type ProgressMetric,
} from "../utils/exerciseProgressCopy";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CHART_LABEL_LIMIT = 6;
const METRICS: ProgressMetric[] = ["weight", "oneRm", "volume"];

type Props = {
  points: ExerciseProgressDataPoint[];
  metric: ProgressMetric;
  onSelectMetric: (metric: ProgressMetric) => void;
};

function seriesFor(
  points: ExerciseProgressDataPoint[],
  metric: ProgressMetric
): number[] {
  switch (metric) {
    case "oneRm":
      return points.map((p) => p.estimated1RM);
    case "volume":
      return points.map((p) => p.totalVolume);
    case "weight":
    default:
      return points.map((p) => p.maxWeight);
  }
}

function metricColor(metric: ProgressMetric, theme: Theme): string {
  switch (metric) {
    case "oneRm":
      return "#f59e0b";
    case "volume":
      return "#8b5cf6";
    case "weight":
    default:
      return theme.primary;
  }
}

function formatDateLabel(dateText: string): string {
  const date = new Date(dateText);
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

export function ExerciseProgressChart({
  points,
  metric,
  onSelectMetric,
}: Props) {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [selectedIndex, setSelectedIndex] = useState(
    Math.max(0, points.length - 1)
  );

  useEffect(() => {
    setSelectedIndex(Math.max(0, points.length - 1));
  }, [points, metric]);

  const values = useMemo(() => seriesFor(points, metric), [points, metric]);
  const color = metricColor(metric, theme);

  const labels = useMemo(() => {
    const raw = points.map((p) => formatDateLabel(p.date));
    const step = Math.max(1, Math.ceil(raw.length / CHART_LABEL_LIMIT));
    return raw.map((label, index) =>
      index % step === 0 || index === raw.length - 1 ? label : ""
    );
  }, [points]);

  const safeIndex = Math.min(selectedIndex, Math.max(0, values.length - 1));
  const selectedValue = values[safeIndex] ?? 0;
  const selectedDate = points[safeIndex]
    ? formatDateLabel(points[safeIndex].date)
    : "";
  const caption =
    points.length === 0
      ? ""
      : pointCaption(
          selectedDate,
          formatKg(selectedValue),
          points.length === 1
        );

  const chartWidth = Math.max(SCREEN_WIDTH - 48, 280);

  return (
    <View style={styles.card}>
      <View style={styles.segments}>
        {METRICS.map((item) => {
          const active = item === metric;
          return (
            <TouchableOpacity
              key={item}
              style={[styles.segment, active && styles.segmentActive]}
              onPress={() => {
                void Haptics.selectionAsync();
                onSelectMetric(item);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text
                style={[
                  styles.segmentText,
                  active && styles.segmentTextActive,
                ]}
              >
                {segmentLabel(item)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {points.length === 0 ? null : points.length === 1 ? (
        <View style={styles.singlePoint}>
          <Text style={styles.caption}>{caption}</Text>
        </View>
      ) : (
        <LineChart
          data={{
            labels,
            datasets: [{ data: values.length > 0 ? values : [0], color: () => color }],
          }}
          width={chartWidth}
          height={180}
          chartConfig={{
            backgroundGradientFrom: theme.card,
            backgroundGradientTo: theme.card,
            decimalPlaces: 0,
            color: () => color,
            labelColor: () => theme.textSecondary,
            propsForDots: {
              r: "3.5",
              strokeWidth: "2",
              stroke: color,
            },
            propsForBackgroundLines: {
              stroke: theme.border,
            },
          }}
          bezier={points.length >= 3}
          style={styles.chart}
          onDataPointClick={({ index }) => {
            setSelectedIndex(index);
            void Haptics.selectionAsync();
          }}
          withInnerLines
          withOuterLines={false}
          withShadow={false}
          fromZero={false}
        />
      )}

      {points.length > 1 ? (
        <Text style={[styles.caption, isDark && styles.captionDark]}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 12,
      gap: 10,
    },
    segments: {
      flexDirection: "row",
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 10,
      padding: 3,
      gap: 2,
    },
    segment: {
      flex: 1,
      borderRadius: 8,
      paddingVertical: 8,
      alignItems: "center",
    },
    segmentActive: {
      backgroundColor: theme.card,
    },
    segmentText: {
      color: theme.textSecondary,
      fontSize: 13,
      fontWeight: "600",
    },
    segmentTextActive: {
      color: theme.text,
      fontWeight: "800",
    },
    chart: {
      marginLeft: -8,
      borderRadius: 12,
    },
    singlePoint: {
      minHeight: 120,
      alignItems: "center",
      justifyContent: "center",
    },
    caption: {
      color: theme.textSecondary,
      fontSize: 13,
      textAlign: "center",
      fontVariant: ["tabular-nums"],
    },
    captionDark: {
      color: theme.textSecondary,
    },
  });
