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
import Icon from "react-native-vector-icons/MaterialIcons";
import { Theme, useTheme } from "../contexts/ThemeContext";

interface CustomToastProps {
  text1: string;
  text2?: string;
  progress?: number;
  onCancel?: () => void;
  onAddTime?: () => void;
  onSubtractTime?: () => void;
  onDismissKeyboard?: () => void;
}

const CustomToast = ({
  text1,
  text2,
  progress = 1,
  onCancel,
  onAddTime,
  onSubtractTime,
  onDismissKeyboard,
}: CustomToastProps) => {
  const { theme, isDark } = useTheme();
  const styles = React.useMemo(
    () => createStyles(theme, isDark),
    [theme, isDark]
  );
  const animatedProgress = useRef(new Animated.Value(progress)).current;
  const { width } = useWindowDimensions();

  // Clamp progress: nunca negativo, nunca mayor a 1
  const safeProgress = Math.max(0, Math.min(1, progress));

  const ringRadius = 27;
  const ringStroke = 6;
  const ringCircumference = 2 * Math.PI * ringRadius;
  // Numeric offset avoids Animated SVG Circle unmount crashes (RNSVG NPE).
  const ringStrokeDashoffset = ringCircumference * (1 - safeProgress);

  useEffect(() => {
    if (process.env.NODE_ENV === "test") {
      animatedProgress.setValue(safeProgress);
      return;
    }

    const animation = Animated.timing(animatedProgress, {
      toValue: safeProgress,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();

    return () => {
      animation.stop();
      animatedProgress.stopAnimation();
    };
  }, [safeProgress, animatedProgress]);

  const interpolatedWidth = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const progressTint =
    safeProgress > 0.5
      ? theme.primary
      : safeProgress > 0.2
      ? theme.warning
      : theme.error;

  const handleAddTime = async () => {
    if (onAddTime) {
      try {
        if (Platform.OS === "ios") {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      } catch (_) {
        // Haptics may fail silently; don't block action.
      }
      onAddTime();
    }
  };

  const handleSubtractTime = async () => {
    if (onSubtractTime) {
      try {
        if (Platform.OS === "ios") {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      } catch (_) {
        // Haptics may fail silently; don't block action.
      }
      onSubtractTime();
    }
  };

  const handleCancel = async () => {
    if (onCancel) {
      try {
        if (Platform.OS === "ios") {
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Warning
          );
        } else {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }
      } catch (_) {
        // Haptics may fail silently; don't block cancel.
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
                stroke={
                  isDark ? "rgba(255,255,255,0.15)" : "rgba(15,23,42,0.12)"
                }
                strokeWidth={ringStroke}
                fill="transparent"
              />
              <Circle
                cx={ringRadius + ringStroke}
                cy={ringRadius + ringStroke}
                r={ringRadius}
                stroke={progressTint}
                strokeWidth={ringStroke}
                strokeLinecap="round"
                fill="transparent"
                strokeDasharray={`${ringCircumference} ${ringCircumference}`}
                strokeDashoffset={ringStrokeDashoffset}
                transform={`rotate(-90 ${ringRadius + ringStroke} ${
                  ringRadius + ringStroke
                })`}
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
          <View style={styles.timeActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleSubtractTime}
              accessibilityLabel="Restar 15 segundos"
              activeOpacity={0.8}
            >
              <Text style={styles.actionButtonText}>−15s</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleAddTime}
              accessibilityLabel="Añadir 15 segundos"
              activeOpacity={0.8}
            >
              <Text style={styles.actionButtonText}>+15s</Text>
            </TouchableOpacity>
          </View>

          {(onCancel || onDismissKeyboard) && (
            <View style={styles.cancelRow}>
              {onCancel && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancel}
                  accessibilityLabel="Omitir descanso"
                  activeOpacity={0.85}
                >
                  <Text style={styles.cancelButtonText}>Omitir</Text>
                </TouchableOpacity>
              )}
              {onDismissKeyboard && (
                <TouchableOpacity
                  style={styles.keyboardDismissButton}
                  onPress={onDismissKeyboard}
                  accessibilityLabel="Ocultar teclado"
                  accessibilityRole="button"
                  activeOpacity={0.85}
                >
                  <Icon name="keyboard-hide" size={18} color={theme.text} />
                </TouchableOpacity>
              )}
            </View>
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

const createStyles = (theme: Theme, isDark: boolean) =>
  StyleSheet.create({
    toastContainer: {
      backgroundColor: theme.surfaceElevated,
      borderRadius: 18,
      padding: 14,
      alignSelf: "center",
      borderWidth: 1,
      borderColor: isDark ? theme.border : `${theme.primary}44`,
      elevation: 10,
      shadowColor: theme.shadowColor,
      shadowOpacity: isDark ? 0.35 : 0.14,
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
      borderRadius: 33,
      backgroundColor: isDark ? "rgba(255,255,255,0.04)" : `${theme.primary}1F`,
    },
    timerText: {
      position: "absolute",
      color: theme.text,
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
      color: theme.text,
      fontSize: 16,
      fontWeight: "800",
      marginBottom: 2,
    },
    toastSubtext: {
      color: theme.textSecondary,
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
      backgroundColor: isDark ? "#262B3E" : `${theme.primary}24`,
      borderRadius: 12,
      paddingVertical: 7,
      paddingHorizontal: 12,
      minWidth: 58,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: isDark ? "#353C56" : `${theme.primary}55`,
    },
    actionButtonText: {
      color: theme.text,
      fontWeight: "700",
      fontSize: 13,
    },
    cancelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    cancelButton: {
      backgroundColor: isDark ? "#2A3047" : `${theme.primary}22`,
      borderRadius: 11,
      paddingVertical: 6,
      paddingHorizontal: 14,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: isDark ? "#3B4565" : `${theme.primary}45`,
    },
    cancelButtonText: {
      color: theme.textSecondary,
      fontWeight: "700",
      fontSize: 13,
    },
    keyboardDismissButton: {
      backgroundColor: isDark ? "#2A3047" : `${theme.primary}22`,
      borderRadius: 11,
      width: 34,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: isDark ? "#3B4565" : `${theme.primary}45`,
    },
    progressBarContainer: {
      width: "100%",
      height: 6,
      backgroundColor: isDark ? "#2A3047" : `${theme.primary}20`,
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
