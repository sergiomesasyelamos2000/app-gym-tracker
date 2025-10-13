import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
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
}) => {
  const { width } = useWindowDimensions();

  // Escalado dinámico
  const dynamicStyles = {
    fontSize: Math.max(12, width * 0.035),
    paddingHorizontal: Math.max(8, width * 0.03),
    paddingVertical: Math.max(4, width * 0.015),
    minWidth: Math.max(60, width * 0.15),
    gap: Math.max(8, width * 0.02),
  };

  return (
    <View style={styles.fixedHeader}>
      <View style={[styles.metricsRow, { gap: dynamicStyles.gap }]}>
        <Text
          style={[
            styles.metricItem,
            {
              fontSize: dynamicStyles.fontSize,
              paddingHorizontal: dynamicStyles.paddingHorizontal,
              paddingVertical: dynamicStyles.paddingVertical,
              minWidth: dynamicStyles.minWidth,
            },
          ]}
        >
          ⏱ {formatTime(duration)}
        </Text>

        <Text
          style={[
            styles.metricItem,
            {
              fontSize: dynamicStyles.fontSize,
              paddingHorizontal: dynamicStyles.paddingHorizontal,
              paddingVertical: dynamicStyles.paddingVertical,
              minWidth: dynamicStyles.minWidth,
            },
          ]}
        >
          🏋️ {volume} kg
        </Text>

        <Text
          style={[
            styles.metricItem,
            {
              fontSize: dynamicStyles.fontSize,
              paddingHorizontal: dynamicStyles.paddingHorizontal,
              paddingVertical: dynamicStyles.paddingVertical,
              minWidth: dynamicStyles.minWidth,
            },
          ]}
        >
          ✅ {completedSets}
        </Text>

        <TouchableOpacity onPress={onFinish}>
          <Text
            style={[
              styles.finishButton,
              {
                fontSize: dynamicStyles.fontSize,
                paddingHorizontal: dynamicStyles.paddingHorizontal,
                paddingVertical: dynamicStyles.paddingVertical,
              },
            ]}
          >
            Terminar
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

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
    flexWrap: "wrap", // para pantallas muy pequeñas
  },
  metricItem: {
    fontWeight: "bold",
    color: "#6C3BAA",
    backgroundColor: "#F4F4F8",
    borderRadius: 12,
    textAlign: "center",
  },
  finishButton: {
    color: "#D32F2F",
    fontWeight: "bold",
    backgroundColor: "#FDECEC",
    borderRadius: 12,
    elevation: 1,
    textAlign: "center",
  },
});
