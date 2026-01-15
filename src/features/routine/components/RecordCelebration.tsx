import * as Haptics from "expo-haptics";
import { TrendingUp, Trophy, Zap } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
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
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const confettiAnims = useRef(
    Array.from({ length: 20 }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(1),
    }))
  ).current;

  useEffect(() => {
    if (visible && record) {
      // Haptic feedback
      if (Platform.OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }

      // Start animations
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Confetti animation
      confettiAnims.forEach((anim, index) => {
        const randomX = (Math.random() - 0.5) * width;
        const randomRotate = Math.random() * 720 - 360;

        Animated.parallel([
          Animated.timing(anim.x, {
            toValue: randomX,
            duration: 2000 + Math.random() * 1000,
            useNativeDriver: true,
          }),
          Animated.timing(anim.y, {
            toValue: height,
            duration: 2000 + Math.random() * 1000,
            useNativeDriver: true,
          }),
          Animated.timing(anim.rotate, {
            toValue: randomRotate,
            duration: 2000 + Math.random() * 1000,
            useNativeDriver: true,
          }),
          Animated.timing(anim.opacity, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]).start();
      });

      // Auto dismiss after 3 seconds
      const timer = setTimeout(() => {
        handleDismiss();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [visible, record]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      confettiAnims.forEach((anim) => {
        anim.x.setValue(0);
        anim.y.setValue(0);
        anim.rotate.setValue(0);
        anim.opacity.setValue(1);
      });
      onDismiss();
    });
  };

  if (!record) return null;

  const getIcon = () => {
    switch (record.type) {
      case "1RM":
        return <Trophy size={48} color="#FFD700" />;
      case "maxWeight":
        return <TrendingUp size={48} color="#FFD700" />;
      case "maxVolume":
        return <Zap size={48} color="#FFD700" />;
    }
  };

  const getMessage = () => {
    const messages = [
      "¡Increíble!",
      "¡Nuevo Récord!",
      "¡Imparable!",
      "¡Bestial!",
      "¡Máquina!",
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        {/* Confetti */}
        {confettiAnims.map((anim, index) => (
          <Animated.View
            key={index}
            style={[
              styles.confetti,
              {
                backgroundColor: [
                  "#FFD700",
                  "#FF6B6B",
                  "#4ECDC4",
                  "#45B7D1",
                  "#FFA07A",
                ][index % 5],
                transform: [
                  { translateX: anim.x },
                  { translateY: anim.y },
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

        {/* Main Card */}
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: theme.card },
            {
              transform: [{ scale: scaleAnim }],
              opacity: fadeAnim,
            },
          ]}
        >
          <View style={styles.iconContainer}>{getIcon()}</View>

          <Text style={[styles.title, { color: "#FFD700" }]}>
            {getMessage()}
          </Text>

          <Text style={[styles.recordType, { color: theme.text }]}>
            {formatRecordType(record.type)}
          </Text>

          <Text style={[styles.exerciseName, { color: theme.textSecondary }]}>
            {record.exerciseName}
          </Text>

          <View style={styles.comparisonContainer}>
            <View style={styles.valueContainer}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Anterior
              </Text>
              <Text style={[styles.value, { color: theme.text }]}>
                {formatRecordValue(record.type, record.previousValue)}
              </Text>
            </View>

            <View style={styles.arrow}>
              <Text style={{ fontSize: 24, color: "#4ECDC4" }}>→</Text>
            </View>

            <View style={styles.valueContainer}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Nuevo
              </Text>
              <Text style={[styles.newValue, { color: "#4ECDC4" }]}>
                {formatRecordValue(record.type, record.value)}
              </Text>
            </View>
          </View>

          <View style={styles.improvementContainer}>
            <Text style={[styles.improvement, { color: "#4ECDC4" }]}>
              +{formatRecordValue(record.type, record.improvement)}
            </Text>
          </View>

          <View style={styles.setInfo}>
            <Text style={[styles.setInfoText, { color: theme.textSecondary }]}>
              {record.setData.weight} kg × {record.setData.reps} reps
            </Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  confetti: {
    position: "absolute",
    width: 10,
    height: 10,
    top: -20,
    left: width / 2,
  },
  card: {
    width: width * 0.85,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  recordType: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  exerciseName: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: "center",
  },
  comparisonContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    gap: 16,
  },
  valueContainer: {
    alignItems: "center",
  },
  label: {
    fontSize: 12,
    marginBottom: 4,
  },
  value: {
    fontSize: 20,
    fontWeight: "600",
  },
  newValue: {
    fontSize: 24,
    fontWeight: "bold",
  },
  arrow: {
    marginHorizontal: 8,
  },
  improvementContainer: {
    backgroundColor: "rgba(78, 205, 196, 0.2)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 16,
  },
  improvement: {
    fontSize: 18,
    fontWeight: "bold",
  },
  setInfo: {
    marginTop: 8,
  },
  setInfoText: {
    fontSize: 14,
  },
});
