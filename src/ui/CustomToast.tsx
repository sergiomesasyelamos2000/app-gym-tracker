import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Animated,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";

interface CustomToastProps {
  text1: string;
  progress?: number;
  onCancel?: () => void;
  onAddTime?: () => void;
  onSubtractTime?: () => void;
}

const CustomToast = ({
  text1,
  progress = 1,
  onCancel,
  onAddTime,
  onSubtractTime,
}: CustomToastProps) => {
  const animatedProgress = useRef(new Animated.Value(progress)).current;
  const { width } = useWindowDimensions();

  useEffect(() => {
    animatedProgress.setValue(progress);
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const interpolatedWidth = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={[styles.toastContainer, { width: width * 0.92 }]}>
      <View style={styles.contentRow}>
        {progress > 0 && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onSubtractTime}
            accessibilityLabel="-15 segundos"
          >
            <Text style={styles.actionButtonText}>−15s</Text>
          </TouchableOpacity>
        )}

        <Text numberOfLines={2} style={styles.toastText}>
          {text1}
        </Text>

        {progress > 0 && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onAddTime}
            accessibilityLabel="+15 segundos"
          >
            <Text style={styles.actionButtonText}>+15s</Text>
          </TouchableOpacity>
        )}

        {onCancel && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            accessibilityLabel="Cancelar"
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        )}
      </View>

      {progress > 0 && (
        <View style={styles.progressBarContainer}>
          <Animated.View
            style={[styles.progressBar, { width: interpolatedWidth }]}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    backgroundColor: "#7C3AED",
    borderRadius: 14,
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    width: "100%",
  },
  toastText: {
    flex: 1,
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  actionButton: {
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 13,
  },
  cancelButton: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginLeft: 6,
  },
  cancelButtonText: {
    color: "#7C3AED",
    fontWeight: "600",
    fontSize: 15,
  },
  progressBarContainer: {
    width: "100%",
    height: 6,
    backgroundColor: "#f1f1f1",
    borderRadius: 3,
    marginTop: 10,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#fff",
  },
});

export default CustomToast;
