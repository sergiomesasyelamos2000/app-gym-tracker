import React from "react";
import { Animated, StyleProp, ViewStyle } from "react-native";
import { useSkeletonPulseContext } from "./SkeletonPulseContext";

type BoneProps = {
  style?: StyleProp<ViewStyle>;
  /** Escape hatch. Default: context value from SkeletonRoot. */
  opacity?: Animated.Value;
};

export function Bone({ style, opacity }: BoneProps) {
  const contextOpacity = useSkeletonPulseContext();
  const pulse = opacity ?? contextOpacity;
  return <Animated.View style={[style, { opacity: pulse }]} />;
}
