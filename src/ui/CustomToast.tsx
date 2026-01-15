import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

interface CustomToastProps {
  text1: string;
  text2?: string;
  progress?: number;
  onCancel?: () => void;
  onAddTime?: () => void;
  onSubtractTime?: () => void;
}

const CustomToast = ({
  text1,
  text2,
  progress = 1,
  onCancel,
  onAddTime,
  onSubtractTime,
}: CustomToastProps) => {
  const animatedProgress = useRef(new Animated.Value(progress)).current;
  const { width } = useWindowDimensions();

  useEffect(() => {
    // Animate progress bar smoothly
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const interpolatedWidth = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const handleAddTime = async () => {
    if (onAddTime) {
      // Haptic feedback
      if (Platform.OS === "ios") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      onAddTime();
    }
  };

  const handleSubtractTime = async () => {
    if (onSubtractTime) {
      // Haptic feedback
      if (Platform.OS === "ios") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      onSubtractTime();
    }
  };

  const handleCancel = async () => {
    if (onCancel) {
      // Haptic feedback for cancel
      if (Platform.OS === "ios") {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning
        );
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
      onCancel();
    }
  };

  return (
    <View style={[styles.toastContainer, { width: width * 0.92 }]}>
      <View style={styles.contentRow}>
        {progress > 0 && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleSubtractTime}
            accessibilityLabel="-15 segundos"
            activeOpacity={0.7}
          >
            <Text style={styles.actionButtonText}>−15s</Text>
          </TouchableOpacity>
        )}

        <View style={styles.textContainer}>
          <Text numberOfLines={1} style={styles.toastText}>
            {text1}
          </Text>
          {text2 && (
            <Text numberOfLines={1} style={styles.toastSubtext}>
              {text2}
            </Text>
          )}
        </View>

        {progress > 0 && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleAddTime}
            accessibilityLabel="+15 segundos"
            activeOpacity={0.7}
          >
            <Text style={styles.actionButtonText}>+15s</Text>
          </TouchableOpacity>
        )}

        {onCancel && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            accessibilityLabel="Cancelar"
            activeOpacity={0.8}
          >
            <Text style={styles.cancelButtonText}>X</Text>
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
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    width: "100%",
  },
  textContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 8,
  },
  toastText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  toastSubtext: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  actionButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  cancelButtonText: {
    color: "#7C3AED",
    fontWeight: "bold",
    fontSize: 16,
  },
  progressBarContainer: {
    width: "100%",
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 4,
    marginTop: 12,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#fff",
    borderRadius: 4,
  },
});

export default CustomToast;
