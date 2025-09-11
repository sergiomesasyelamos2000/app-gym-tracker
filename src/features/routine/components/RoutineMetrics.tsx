import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { formatTime } from "../utils/routineHelpers";

type Props = {
  duration: number;
  volume: number;
  completedSets: number;
  onFinish?: () => void;
};

export const RoutineMetrics: React.FC<Props> = ({
  duration,
  volume,
  completedSets,
  onFinish,
}) => (
  <View style={styles.fixedHeader}>
    <View style={styles.metricsRow}>
      <Text style={styles.metricItem}>⏱ {formatTime(duration)}</Text>
      <Text style={styles.metricItem}>🏋️ {volume} kg</Text>
      <Text style={styles.metricItem}>✅ {completedSets}</Text>

      <TouchableOpacity onPress={onFinish}>
        <Text style={styles.finishButton}>Terminar</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  fixedHeader: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    elevation: 3,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EDEAF6",
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  metricItem: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#6C3BAA",
    backgroundColor: "#F4F4F8",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 70,
    textAlign: "center",
  },
  finishButton: {
    color: "#D32F2F",
    fontWeight: "bold",
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "#FDECEC",
    borderRadius: 12,
    elevation: 1,
  },
});
