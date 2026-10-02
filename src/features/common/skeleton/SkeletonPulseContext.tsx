import React, { createContext, useContext } from "react";
import { Animated } from "react-native";

const SkeletonPulseContext = createContext<Animated.Value | null>(null);

export function useSkeletonPulseContext(): Animated.Value {
  const value = useContext(SkeletonPulseContext);
  if (!value) {
    throw new Error(
      "Bone/SkeletonMessage must be rendered inside SkeletonRoot"
    );
  }
  return value;
}

/** Optional read — returns null outside a SkeletonRoot. */
export function useOptionalSkeletonPulse(): Animated.Value | null {
  return useContext(SkeletonPulseContext);
}

export const SkeletonPulseProvider = SkeletonPulseContext.Provider;
