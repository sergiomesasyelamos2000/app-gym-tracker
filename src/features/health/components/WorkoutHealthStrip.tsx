import React, { memo, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import { useTheme } from "../../../contexts/ThemeContext";
import type { HealthMetricsSource } from "../types";

type Props = {
  heartRateBpm: number | null;
  caloriesBurned: number | null;
  source: HealthMetricsSource;
};

function sourceLabel(source: HealthMetricsSource): string {
  switch (source) {
    case "healthkit":
      return "Salud";
    case "health_connect":
      return "Health Connect";
    case "met_estimate":
      return "Estimación";
    default:
      return "Sin datos";
  }
}

function WorkoutHealthStripComponent({
  heartRateBpm,
  caloriesBurned,
  source,
}: Props) {
  const { theme } = useTheme();

  const containerStyle = useMemo(
    () => [
      styles.container,
      {
        backgroundColor: theme.card,
        borderBottomColor: theme.border,
      },
    ],
    [theme.card, theme.border]
  );

  if (source === "unavailable" && heartRateBpm == null && caloriesBurned == null) {
    return null;
  }

  return (
    <View style={containerStyle}>
      <View style={styles.metric}>
        <Text style={[styles.value, { color: theme.error }]}>
          {heartRateBpm != null ? `${heartRateBpm}` : "—"}
        </Text>
        <Text style={[styles.label, { color: theme.textSecondary }]}>BPM</Text>
      </View>
      <View style={[styles.divider, { backgroundColor: theme.divider }]} />
      <View style={styles.metric}>
        <Text style={[styles.value, { color: theme.text }]}>
          {caloriesBurned != null ? `${caloriesBurned}` : "—"}
        </Text>
        <Text style={[styles.label, { color: theme.textSecondary }]}>kcal</Text>
      </View>
      <View style={[styles.divider, { backgroundColor: theme.divider }]} />
      <View style={[styles.metric, styles.sourceMetric]}>
        <Text
          style={[styles.sourceText, { color: theme.textTertiary }]}
          numberOfLines={1}
        >
          {sourceLabel(source)}
        </Text>
      </View>
    </View>
  );
}

export const WorkoutHealthStrip = memo(WorkoutHealthStripComponent);

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 72,
    left: 0,
    right: 0,
    zIndex: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  metric: {
    alignItems: "center",
    minWidth: 64,
  },
  sourceMetric: {
    minWidth: 96,
  },
  value: {
    fontSize: RFValue(15),
    fontWeight: "700",
  },
  label: {
    fontSize: RFValue(9),
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  sourceText: {
    fontSize: RFValue(10),
    fontWeight: "600",
  },
  divider: {
    width: 1,
    height: 22,
  },
});
