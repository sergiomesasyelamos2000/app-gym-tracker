import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import {
  SKELETON_OPACITY_MAX,
  SKELETON_OPACITY_MIN,
  SKELETON_PULSE_MS,
} from "./skeletonPulse";

/**
 * Single native opacity loop for a skeleton tree.
 * Call once in SkeletonRoot — do not call inside Bone.
 */
export function useSkeletonPulse(): Animated.Value {
  const boneOpacity = useRef(
    new Animated.Value(SKELETON_OPACITY_MIN)
  ).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(boneOpacity, {
          toValue: SKELETON_OPACITY_MAX,
          duration: SKELETON_PULSE_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(boneOpacity, {
          toValue: SKELETON_OPACITY_MIN,
          duration: SKELETON_PULSE_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [boneOpacity]);

  return boneOpacity;
}
