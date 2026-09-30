import React, { useEffect, useRef, useState } from "react";
import { StyleProp, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  LIST_SWAP_FADE_MS,
  ROW_ENTER_GATE_MS,
} from "./useListSwapAnimation";

type Props = {
  swapKey: string;
  style?: StyleProp<ViewStyle>;
  fadeMs?: number;
  gateMs?: number;
  /** When false (default), first mount does not enable row entering. */
  animateFirstMount?: boolean;
  children: (allowRowEntering: boolean) => React.ReactNode;
};

/**
 * Soft opacity crossfade when swapKey changes — keeps FlatList mounted
 * (no scroll reset / key remount). Gates per-row FadeInDown briefly.
 */
export function SwapListShell({
  swapKey,
  style,
  fadeMs = LIST_SWAP_FADE_MS,
  gateMs = ROW_ENTER_GATE_MS,
  animateFirstMount = false,
  children,
}: Props) {
  const opacity = useSharedValue(1);
  const [allowRowEntering, setAllowRowEntering] = useState(animateFirstMount);
  const isFirstMountRef = useRef(true);
  const prevKeyRef = useRef(swapKey);
  const gateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      prevKeyRef.current = swapKey;
      if (!animateFirstMount) {
        setAllowRowEntering(false);
      }
      return;
    }

    if (prevKeyRef.current === swapKey) {
      return;
    }
    prevKeyRef.current = swapKey;

    opacity.value = 0.4;
    opacity.value = withTiming(1, { duration: fadeMs });

    setAllowRowEntering(true);
    if (gateTimerRef.current) {
      clearTimeout(gateTimerRef.current);
    }
    gateTimerRef.current = setTimeout(() => {
      setAllowRowEntering(false);
      gateTimerRef.current = null;
    }, gateMs);

    return () => {
      if (gateTimerRef.current) {
        clearTimeout(gateTimerRef.current);
        gateTimerRef.current = null;
      }
    };
  }, [swapKey, fadeMs, gateMs, animateFirstMount, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[{ flex: 1 }, style, animatedStyle]}>
      {children(allowRowEntering)}
    </Animated.View>
  );
}
