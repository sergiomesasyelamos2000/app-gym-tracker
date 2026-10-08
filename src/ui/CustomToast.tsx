import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { Theme, useTheme } from "../contexts/ThemeContext";

interface CustomToastProps {
  text1: string;
  progress?: number;
  onCancel?: () => void;
  onAddTime?: () => void;
  onSubtractTime?: () => void;
  onDismissKeyboard?: () => void;
  /** Extra padding inside the bar. Parent passes home-indicator inset when docked. */
  contentPaddingBottom?: number;
}

const CustomToast = ({
  text1,
  progress = 1,
  onCancel,
  onAddTime,
  onSubtractTime,
  onDismissKeyboard,
  contentPaddingBottom = 12,
}: CustomToastProps) => {
  const { theme, isDark } = useTheme();
  const styles = React.useMemo(
    () => createStyles(theme, isDark),
    [theme, isDark]
  );
  const animatedProgress = useRef(new Animated.Value(progress)).current;

  const safeProgress = Math.max(0, Math.min(1, progress));

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
    <View
      style={[
        styles.toastContainer,
        { paddingBottom: contentPaddingBottom },
      ]}
    >
      <View style={styles.progressTrack}>
        <Animated.View
          testID="rest-progress-fill"
          style={[
            styles.progressFill,
            {
              width: interpolatedWidth,
              backgroundColor: theme.primary,
            },
          ]}
        />
      </View>

      <Text style={styles.timerText}>{text1}</Text>

      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[styles.actionButton, styles.flexButton]}
          onPress={handleSubtractTime}
          accessibilityLabel="Restar 15 segundos"
          activeOpacity={0.8}
        >
          <Text style={styles.actionButtonText}>−15</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.flexButton]}
          onPress={handleAddTime}
          accessibilityLabel="Añadir 15 segundos"
          activeOpacity={0.8}
        >
          <Text style={styles.actionButtonText}>+15</Text>
        </TouchableOpacity>
        {onCancel ? (
          <TouchableOpacity
            style={[styles.skipButton, styles.flexButton]}
            onPress={handleCancel}
            accessibilityLabel="Omitir descanso"
            activeOpacity={0.85}
          >
            <Text style={styles.skipButtonText}>Omitir</Text>
          </TouchableOpacity>
        ) : null}
        {onDismissKeyboard ? (
          <TouchableOpacity
            style={styles.keyboardDismissButton}
            onPress={onDismissKeyboard}
            accessibilityLabel="Ocultar teclado"
            accessibilityRole="button"
            activeOpacity={0.85}
          >
            <Icon name="keyboard-hide" size={18} color={theme.text} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const createStyles = (theme: Theme, isDark: boolean) =>
  StyleSheet.create({
    toastContainer: {
      width: "100%",
      backgroundColor: theme.surface,
      paddingTop: 12,
      paddingHorizontal: 16,
      shadowColor: theme.shadowColor,
      shadowOpacity: isDark ? 0.4 : 0.12,
      shadowOffset: { width: 0, height: -4 },
      shadowRadius: 12,
      elevation: 16,
    },
    progressTrack: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 3,
      backgroundColor: theme.border,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
    },
    timerText: {
      color: theme.text,
      fontSize: 34,
      fontWeight: "800",
      textAlign: "center",
      marginTop: 8,
      marginBottom: 14,
      fontVariant: ["tabular-nums"],
      letterSpacing: 0.5,
    },
    controlsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    flexButton: {
      flex: 1,
    },
    actionButton: {
      backgroundColor: isDark ? theme.surfaceElevated : theme.divider,
      borderRadius: 12,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    actionButtonText: {
      color: theme.text,
      fontWeight: "700",
      fontSize: 16,
    },
    skipButton: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    skipButtonText: {
      color: theme.onPrimary,
      fontWeight: "700",
      fontSize: 16,
    },
    keyboardDismissButton: {
      backgroundColor: isDark ? theme.surfaceElevated : theme.divider,
      borderRadius: 12,
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
  });

export default CustomToast;
