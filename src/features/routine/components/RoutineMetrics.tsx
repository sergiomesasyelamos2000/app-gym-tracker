import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import { useTheme } from "../../../contexts/ThemeContext";
import { formatTime } from "../utils/routineHelpers";

type Props = {
  duration: number;
  volume: number;
  completedSets: number;
  records: number;
  onFinish?: () => void;
};

export const RoutineMetrics: React.FC<Props> = ({
  duration,
  volume,
  completedSets,
  records,
  onFinish,
}) => {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 360;
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderBottomColor: theme.border,
          shadowColor: theme.shadowColor,
        },
      ]}
    >
      {/* Métricas en fila */}
      <View style={styles.metricsContainer}>
        {/* Tiempo */}
        <View style={styles.metricItem}>
          <Text style={[styles.metricValue, { color: theme.text }]}>
            {formatTime(duration)}
          </Text>
          <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
            Tiempo
          </Text>
        </View>

        <View style={[styles.separator, { backgroundColor: theme.divider }]} />

        {/* Volumen */}
        <View style={styles.metricItem}>
          <Text style={[styles.metricValue, { color: theme.text }]}>
            {volume.toLocaleString("es-ES")}
          </Text>
          <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
            Kg Total
          </Text>
        </View>

        <View style={[styles.separator, { backgroundColor: theme.divider }]} />

        {/* Series */}
        <View style={styles.metricItem}>
          <Text style={[styles.metricValue, { color: theme.text }]}>
            {completedSets}
          </Text>
          <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
            Series
          </Text>
        </View>

        <View style={[styles.separator, { backgroundColor: theme.divider }]} />

        {/* Récords */}
        <View style={styles.metricItem}>
          <Text style={[styles.metricValue, { color: "#FFD700" }]}>
            {records}
          </Text>
          <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
            Récords
          </Text>
        </View>
      </View>

      {/* Botón Finalizar */}
      <TouchableOpacity
        style={[
          styles.finishButton,
          { backgroundColor: theme.primary, shadowColor: theme.primary },
          isSmallScreen && styles.finishButtonSmall,
        ]}
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
    ...Platform.select({
      ios: {
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
    letterSpacing: -0.3,
  },
  metricLabel: {
    fontSize: RFValue(9),
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  separator: {
    width: 1,
    height: 28,
  },
  finishButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 95,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
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
