import * as Haptics from "expo-haptics";
import { ArrowRight, TrendingUp, Trophy, Zap } from "lucide-react-native";
import React, { useCallback, useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "../../../contexts/ThemeContext";
import {
  RecordData,
  formatRecordType,
  formatRecordValue,
} from "../../../services/recordsService";

interface Props {
  visible: boolean;
  record: RecordData | null;
  onDismiss: () => void;
}

const { width, height } = Dimensions.get("window");

export default function RecordCelebration({
  visible,
  record,
  onDismiss,
}: Props) {
  const { theme } = useTheme();
  const cardScaleAnim = useRef(new Animated.Value(0.86)).current;
  const cardTranslateYAnim = useRef(new Animated.Value(26)).current;
  const cardOpacityAnim = useRef(new Animated.Value(0)).current;
  const backdropOpacityAnim = useRef(new Animated.Value(0)).current;
  const iconPulseAnim = useRef(new Animated.Value(0.85)).current;
  const autoDismissProgressAnim = useRef(new Animated.Value(1)).current;
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const titleIndexRef = useRef(0);
  const confettiAnims = useRef(
    Array.from({ length: 24 }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(1),
      scale: new Animated.Value(1),
    }))
  ).current;

  const resetAnimations = useCallback(() => {
    pulseLoopRef.current?.stop();
    pulseLoopRef.current = null;

    cardScaleAnim.setValue(0.86);
    cardTranslateYAnim.setValue(26);
    cardOpacityAnim.setValue(0);
    backdropOpacityAnim.setValue(0);
    iconPulseAnim.setValue(0.85);
    autoDismissProgressAnim.setValue(1);

    confettiAnims.forEach((anim) => {
      anim.x.setValue(0);
      anim.y.setValue(0);
      anim.rotate.setValue(0);
      anim.opacity.setValue(1);
      anim.scale.setValue(1);
    });
  }, [
    autoDismissProgressAnim,
    backdropOpacityAnim,
    cardOpacityAnim,
    cardScaleAnim,
    cardTranslateYAnim,
    confettiAnims,
    iconPulseAnim,
    pulseLoopRef,
  ]);

  const clearDismissTimer = useCallback(() => {
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
      dismissTimeoutRef.current = null;
    }
  }, []);

  const handleDismiss = useCallback(() => {
    clearDismissTimer();

    Animated.parallel([
      Animated.timing(backdropOpacityAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacityAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(cardScaleAnim, {
        toValue: 0.92,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(cardTranslateYAnim, {
        toValue: 12,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      resetAnimations();
      onDismiss();
    });
  }, [
    backdropOpacityAnim,
    cardOpacityAnim,
    cardScaleAnim,
    cardTranslateYAnim,
    clearDismissTimer,
    onDismiss,
    resetAnimations,
  ]);

  useEffect(() => {
    if (!record) return;

    if (visible && record) {
      if (Platform.OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }

      titleIndexRef.current = (titleIndexRef.current + 1) % 5;
      resetAnimations();

      Animated.parallel([
        Animated.timing(backdropOpacityAnim, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.spring(cardScaleAnim, {
          toValue: 1,
          tension: 70,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(cardTranslateYAnim, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(iconPulseAnim, {
            toValue: 1.05,
            duration: 420,
            useNativeDriver: true,
          }),
          Animated.timing(iconPulseAnim, {
            toValue: 0.96,
            duration: 420,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoopRef.current.start();

      Animated.timing(autoDismissProgressAnim, {
        toValue: 0,
        duration: 3000,
        useNativeDriver: false,
      }).start();

      confettiAnims.forEach((anim, index) => {
        const randomX = (Math.random() - 0.5) * width;
        const randomY = height * (0.68 + Math.random() * 0.34);
        const randomRotate = Math.random() * 480 - 240;
        const randomScale = 0.6 + Math.random() * 0.9;

        Animated.sequence([
          Animated.delay(index * 14),
          Animated.parallel([
            Animated.timing(anim.scale, {
              toValue: randomScale,
              duration: 350,
              useNativeDriver: true,
            }),
            Animated.timing(anim.x, {
              toValue: randomX,
              duration: 2100 + Math.random() * 650,
              useNativeDriver: true,
            }),
            Animated.timing(anim.y, {
              toValue: randomY,
              duration: 2100 + Math.random() * 700,
              useNativeDriver: true,
            }),
            Animated.timing(anim.rotate, {
              toValue: randomRotate,
              duration: 2100 + Math.random() * 650,
              useNativeDriver: true,
            }),
            Animated.timing(anim.opacity, {
              toValue: 0,
              duration: 2100,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      });

      clearDismissTimer();
      dismissTimeoutRef.current = setTimeout(() => {
        handleDismiss();
      }, 3000);
    } else if (!visible) {
      clearDismissTimer();
      resetAnimations();
    }

    return () => {
      clearDismissTimer();
    };
  }, [
    autoDismissProgressAnim,
    backdropOpacityAnim,
    cardOpacityAnim,
    cardScaleAnim,
    cardTranslateYAnim,
    clearDismissTimer,
    confettiAnims,
    handleDismiss,
    iconPulseAnim,
    record,
    resetAnimations,
    visible,
  ]);

  if (!record) return null;

  const getIcon = () => {
    switch (record.type) {
      case "1RM":
        return <Trophy size={46} color="#F8C53B" />;
      case "maxWeight":
        return <TrendingUp size={46} color="#F8C53B" />;
      case "maxVolume":
        return <Zap size={46} color="#F8C53B" />;
      default:
        return <Trophy size={46} color="#F8C53B" />;
    }
  };

  const getMessage = () => {
    const messages = [
      "Nuevo récord",
      "Vas muy fuerte",
      "Marca personal",
      "Nivel superior",
      "Progreso real",
    ];
    return messages[titleIndexRef.current];
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <Animated.View style={[styles.overlay, { opacity: backdropOpacityAnim }]}>
        {confettiAnims.map((anim, index) => (
          <Animated.View
            key={index}
            style={[
              styles.confetti,
              {
                backgroundColor: [
                  "#F8C53B",
                  "#FF7F66",
                  "#4FD1C5",
                  "#60A5FA",
                  "#F6A6D8",
                ][index % 5],
                transform: [
                  { translateX: anim.x },
                  { translateY: anim.y },
                  { scale: anim.scale },
                  {
                    rotate: anim.rotate.interpolate({
                      inputRange: [0, 360],
                      outputRange: ["0deg", "360deg"],
                    }),
                  },
                ],
                opacity: anim.opacity,
              },
            ]}
          />
        ))}

        <Pressable style={styles.pressableArea} onPress={handleDismiss}>
          <Animated.View
            style={[
              styles.card,
              { backgroundColor: theme.card },
              {
                opacity: cardOpacityAnim,
                transform: [
                  { translateY: cardTranslateYAnim },
                  { scale: cardScaleAnim },
                ],
              },
            ]}
          >
            <View style={styles.badgeRow}>
              <Text style={[styles.badge, { color: theme.primary }]}>RECORD</Text>
            </View>

            <Animated.View
              style={[
                styles.iconHalo,
                { transform: [{ scale: iconPulseAnim }], borderColor: "#F8C53B55" },
              ]}
            >
              <View style={styles.iconContainer}>{getIcon()}</View>
            </Animated.View>

            <Text style={[styles.title, { color: theme.text }]}>{getMessage()}</Text>

            <Text style={[styles.recordType, { color: theme.text }]}>
              {formatRecordType(record.type)}
            </Text>

            <Text style={[styles.exerciseName, { color: theme.textSecondary }]}>
              {record.exerciseName}
            </Text>

            <View style={styles.comparisonContainer}>
              <View style={[styles.valueBlock, { backgroundColor: theme.backgroundSecondary }]}>
                <Text style={[styles.label, { color: theme.textTertiary }]}>Anterior</Text>
                <Text style={[styles.value, { color: theme.text }]}>
                  {formatRecordValue(record.type, record.previousValue)}
                </Text>
              </View>

              <View style={styles.arrowCircle}>
                <ArrowRight size={18} color="#4FD1C5" />
              </View>

              <View style={[styles.valueBlock, { backgroundColor: "#4FD1C51A" }]}>
                <Text style={[styles.label, { color: theme.textTertiary }]}>Nuevo</Text>
                <Text style={[styles.newValue, { color: "#23B7AA" }]}>
                  {formatRecordValue(record.type, record.value)}
                </Text>
              </View>
            </View>

            <View style={styles.improvementContainer}>
              <Text style={styles.improvementText}>
                +{formatRecordValue(record.type, record.improvement)} de mejora
              </Text>
            </View>

            <View style={styles.setInfo}>
              <Text style={[styles.setInfoText, { color: theme.textSecondary }]}>
                {record.setData.weight} kg x {record.setData.reps} reps
              </Text>
            </View>

            <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    backgroundColor: theme.primary,
                    width: autoDismissProgressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
                  },
                ]}
              />
            </View>

            <Text style={[styles.dismissHint, { color: theme.textTertiary }]}>
              Toca para cerrar
            </Text>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  pressableArea: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  confetti: {
    position: "absolute",
    width: 9,
    height: 14,
    top: -20,
    left: width / 2,
    borderRadius: 3,
  },
  card: {
    width: width * 0.9,
    maxWidth: 430,
    borderRadius: 28,
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 22,
    elevation: 12,
  },
  badgeRow: {
    width: "100%",
    alignItems: "center",
    marginBottom: 8,
  },
  badge: {
    fontSize: 11,
    letterSpacing: 1.6,
    fontWeight: "800",
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  iconHalo: {
    width: 106,
    height: 106,
    borderRadius: 53,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  iconContainer: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "rgba(248, 197, 59, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 2,
    textAlign: "center",
  },
  recordType: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 4,
  },
  exerciseName: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  comparisonContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 14,
  },
  valueBlock: {
    flex: 1,
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  label: {
    fontSize: 12,
    marginBottom: 5,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  value: {
    fontSize: 19,
    fontWeight: "700",
  },
  newValue: {
    fontSize: 21,
    fontWeight: "800",
  },
  arrowCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(79, 209, 197, 0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 10,
  },
  improvementContainer: {
    backgroundColor: "rgba(35, 183, 170, 0.14)",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    marginBottom: 16,
  },
  improvementText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#149A90",
  },
  setInfo: {
    marginBottom: 12,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(148, 163, 184, 0.12)",
  },
  setInfoText: {
    fontSize: 13,
    fontWeight: "600",
  },
  progressTrack: {
    width: "100%",
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 10,
  },
  progressBar: {
    height: "100%",
    borderRadius: 999,
  },
  dismissHint: {
    fontSize: 12,
    fontWeight: "500",
  },
});
