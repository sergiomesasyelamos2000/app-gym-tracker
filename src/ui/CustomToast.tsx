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
import { Theme, useTheme } from "../contexts/ThemeContext";

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
  const { theme, isDark } = useTheme();
  const styles = React.useMemo(
    () => createStyles(theme, isDark),
    [theme, isDark]
  );
  const animatedProgress = useRef(new Animated.Value(progress)).current;
  const { width } = useWindowDimensions();

  // Clamp progress: nunca negativo, nunca mayor a 1
  // FIX: no ocultar botones cuando progress <= 0; los botones siempre deben ser accesibles
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
    safeProgress > 0.5
      ? theme.primary
      : safeProgress > 0.2
      ? theme.warning
      : theme.error;

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
        {/* Sección izquierda: anillo + título */}
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

        {/* Sección derecha: controles */}
        <View style={styles.controls}>
          {/* 
            FIX: Botones −15s y +15s siempre visibles mientras el toast esté montado.
            Antes estaban dentro de {safeProgress > 0 && ...}, lo que los ocultaba
            cuando el tiempo llegaba a 0, impidiendo añadir tiempo en el último segundo.
          */}
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

          {/*
            FIX: Botón "Omitir" en lugar de "X".
            - Texto claro: el usuario sabe que omite el descanso.
            - Siempre visible cuando onCancel está disponible.
            - Llama directamente a handleCancel, que invoca onCancel()
              → handleCancelRestTimer en RoutineDetailScreen
              → limpia countdownRef, cancela notificación, llama endRestTimerLive().
          */}
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
        </View>
      </View>

      {/* Barra de progreso: se muestra siempre que haya progreso > 0 */}
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

const createStyles = (theme: Theme, isDark: boolean) =>
  StyleSheet.create({
    toastContainer: {
      backgroundColor: isDark ? "#181B27" : theme.card,
      borderRadius: 18,
      padding: 14,
      alignSelf: "center",
      borderWidth: 1,
      borderColor: isDark ? "#2A2F43" : `${theme.primary}44`,
      elevation: 10,
      shadowColor: "#000",
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
    // FIX: cancelButton redimensionado para acomodar el texto "Omitir"
    // en lugar del símbolo "X" que requería solo 32x32px
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
