import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";

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
  const safeProgress = Math.max(0, Math.min(1, progress));
  const ringRadius = 27;
  const ringStroke = 6;
  const ringCircumference = 2 * Math.PI * ringRadius;

  useEffect(() => {
    if (process.env.NODE_ENV === "test") {
      animatedProgress.setValue(safeProgress);
      return;
    }

    Animated.timing(animatedProgress, {
      toValue: safeProgress,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [safeProgress, animatedProgress]);

  const interpolatedWidth = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const interpolatedRingOffset = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [ringCircumference, 0],
  });

  const progressTint =
    safeProgress > 0.5 ? "#6D5CFF" : safeProgress > 0.2 ? "#8F7BFF" : "#FF6B6B";

  const handleAddTime = async () => {
    if (onAddTime) {
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
    <View style={[styles.toastContainer, { width: width * 0.93 }]}>
      <View style={styles.topRow}>
        <View style={styles.timerSection}>
          <View style={styles.ringWrapper}>
            <Svg
              width={(ringRadius + ringStroke) * 2}
              height={(ringRadius + ringStroke) * 2}
            >
              <Circle
                cx={ringRadius + ringStroke}
                cy={ringRadius + ringStroke}
                r={ringRadius}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth={ringStroke}
                fill="transparent"
              />
              <AnimatedCircle
                cx={ringRadius + ringStroke}
                cy={ringRadius + ringStroke}
                r={ringRadius}
                stroke={progressTint}
                strokeWidth={ringStroke}
                strokeLinecap="round"
                fill="transparent"
                strokeDasharray={ringCircumference}
                strokeDashoffset={interpolatedRingOffset}
                transform={`rotate(-90 ${ringRadius + ringStroke} ${ringRadius + ringStroke})`}
              />
            </Svg>
            <Text style={styles.timerText}>{text1}</Text>
          </View>

          <View style={styles.textContainer}>
            <Text numberOfLines={1} style={styles.toastTitle}>
              Descanso
            </Text>
            {text2 ? (
              <Text numberOfLines={1} style={styles.toastSubtext}>
                {text2}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.controls}>
          {safeProgress > 0 && (
            <View style={styles.timeActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleSubtractTime}
                accessibilityLabel="-15 segundos"
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonText}>−15s</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleAddTime}
                accessibilityLabel="+15 segundos"
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonText}>+15s</Text>
              </TouchableOpacity>
            </View>
          )}

          {onCancel && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              accessibilityLabel="Cancelar"
              activeOpacity={0.85}
            >
              <Text style={styles.cancelButtonText}>X</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {safeProgress > 0 && (
        <View style={styles.progressBarContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              { width: interpolatedWidth, backgroundColor: progressTint },
            ]}
          />
        </View>
      )}
    </View>
  );
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const styles = StyleSheet.create({
  toastContainer: {
    backgroundColor: "#181B27",
    borderRadius: 18,
    padding: 14,
    alignSelf: "center",
    borderWidth: 1,
    borderColor: "#2A2F43",
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 14,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    width: "100%",
  },
  timerSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  ringWrapper: {
    width: 66,
    height: 66,
    alignItems: "center",
    justifyContent: "center",
  },
  timerText: {
    position: "absolute",
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
    paddingTop: 8,
  },
  toastTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 2,
  },
  toastSubtext: {
    color: "#AAB1C8",
    fontSize: 13,
    fontWeight: "500",
  },
  controls: {
    alignItems: "flex-end",
    gap: 8,
  },
  timeActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    backgroundColor: "#262B3E",
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 12,
    minWidth: 58,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#353C56",
  },
  actionButtonText: {
    color: "#EFF2FF",
    fontWeight: "700",
    fontSize: 13,
  },
  cancelButton: {
    backgroundColor: "#2A3047",
    borderRadius: 11,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#3B4565",
  },
  cancelButtonText: {
    color: "#D9E0F7",
    fontWeight: "700",
    fontSize: 13,
  },
  progressBarContainer: {
    width: "100%",
    height: 6,
    backgroundColor: "#2A3047",
    borderRadius: 999,
    marginTop: 12,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 999,
  },
});

export default CustomToast;
