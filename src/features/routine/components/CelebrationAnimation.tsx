import React, { useEffect } from "react";
import { StyleSheet, View, Dimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  withRepeat,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { Trophy } from "lucide-react-native";

const { width, height } = Dimensions.get("window");

interface CelebrationProps {
  visible: boolean;
  onFinish?: () => void;
  triggerKey?: number;
}

const PARTICLE_COUNT = 20;

interface ParticleProps {
  delay: number;
  angle: number;
  speed?: number;
  color: string;
}

const Particle = ({ delay, angle, speed, color }: ParticleProps) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0);

  useEffect(() => {
    // Reset values
    translateX.value = 0;
    translateY.value = 0;
    opacity.value = 1;
    scale.value = 0;

    // Start animation
    scale.value = withDelay(delay, withSpring(1));

    // Move outward based on angle
    const rad = (angle * Math.PI) / 180;
    const distance = 70 + Math.random() * 70;

    translateX.value = withDelay(
      delay,
      withTiming(Math.cos(rad) * distance, {
        duration: 620,
        easing: Easing.out(Easing.ease),
      }),
    );

    translateY.value = withDelay(
      delay,
      withTiming(Math.sin(rad) * distance, {
        duration: 620,
        easing: Easing.out(Easing.ease),
      }),
    );

    // Fade out
    opacity.value = withDelay(delay + 250, withTiming(0, { duration: 360 }));
  }, []);

  const style = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View
      style={[styles.particle, style, { backgroundColor: color }]}
    />
  );
};

export const CelebrationAnimation = ({
  visible,
  onFinish,
  triggerKey = 0,
}: CelebrationProps) => {
  const trophyScale = useSharedValue(0);
  const trophyOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Trophy animation
      trophyScale.value = 0;
      trophyOpacity.value = 0;

      trophyOpacity.value = withTiming(1, { duration: 300 });
      trophyScale.value = withSequence(
        withSpring(1.28, { damping: 11 }),
        withDelay(
          260,
          withTiming(0, { duration: 130 }, (finished) => {
            if (finished && onFinish) {
              runOnJS(onFinish)();
            }
          }),
        ),
      );
    }
  }, [visible, triggerKey]);

  const trophyStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: trophyScale.value }],
      opacity: trophyOpacity.value,
    };
  });

  if (!visible) return null;

  const colors = ["#FFD700", "#FFA500", "#FF4500", "#87CEEB", "#90EE90"];

  return (
    <View
      style={[StyleSheet.absoluteFill, styles.container]}
      pointerEvents="none"
    >
      <Animated.View style={[styles.trophyContainer, trophyStyle]}>
        <Trophy size={64} color="#FFD700" fill="#FFD700" />
        {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
          <Particle
            key={i}
            delay={Math.random() * 200}
            angle={Math.random() * 360}
            color={colors[Math.floor(Math.random() * colors.length)]}
          />
        ))}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999, // Ensure it's on top
    backgroundColor: "transparent",
  },
  trophyContainer: {
    alignItems: "center",
    justifyContent: "center",
    transform: [{ translateY: -20 }],
  },
  particle: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
