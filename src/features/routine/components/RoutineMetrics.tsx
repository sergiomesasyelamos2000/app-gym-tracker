import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  Platform,
} from "react-native";
import { formatTime } from "../utils/routineHelpers";
import { RFValue } from "react-native-responsive-fontsize";

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
  const isSmallScreen = width < 360;

  return (
    <View style={styles.container}>
      {/* Métricas en fila */}
      <View style={styles.metricsContainer}>
        {/* Tiempo */}
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{formatTime(duration)}</Text>
          <Text style={styles.metricLabel}>Tiempo</Text>
        </View>

        <View style={styles.separator} />

        {/* Volumen */}
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>
            {volume.toLocaleString("es-ES")}
          </Text>
          <Text style={styles.metricLabel}>Kg Total</Text>
        </View>

        <View style={styles.separator} />

        {/* Series */}
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{completedSets}</Text>
          <Text style={styles.metricLabel}>Series</Text>
        </View>
      </View>

      {/* Botón Finalizar */}
      <TouchableOpacity
        style={[styles.finishButton, isSmallScreen && styles.finishButtonSmall]}
        onPress={onFinish}
        activeOpacity={0.8}
      >
        <Text
          style={[
            styles.finishButtonText,
            isSmallScreen && styles.finishButtonTextSmall,
          ]}
        >
          Finalizar
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  metricsContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  metricItem: {
    alignItems: "center",
    gap: 2,
  },
  metricValue: {
    fontSize: RFValue(16),
    fontWeight: "700",
    color: "#1A1A1A",
    letterSpacing: -0.3,
  },
  metricLabel: {
    fontSize: RFValue(9),
    fontWeight: "600",
    color: "#8A8A8A",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  separator: {
    width: 1,
    height: 28,
    backgroundColor: "#E8E8E8",
  },
  finishButton: {
    backgroundColor: "#8B5CF6",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 95,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#8B5CF6",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  finishButtonSmall: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 85,
  },
  finishButtonText: {
    fontSize: RFValue(13),
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  finishButtonTextSmall: {
    fontSize: RFValue(12),
  },
});
