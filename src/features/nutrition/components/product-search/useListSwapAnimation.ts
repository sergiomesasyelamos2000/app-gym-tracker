import { useEffect, useRef, useState } from "react";
import { FadeIn, FadeOut } from "react-native-reanimated";

export const LIST_SWAP_FADE_MS = 200;
export const ROW_ENTER_MS = 220;
export const ROW_ENTER_GATE_MS = 450;
export const ROW_ENTER_STAGGER_MS = 16;
export const ROW_ENTER_STAGGER_MAX_MS = 64;

type Options = {
  fadeMs?: number;
  gateMs?: number;
  /** When false (default), first mount does not enable row entering. */
  animateFirstMount?: boolean;
};

type Result = {
  allowRowEntering: boolean;
  listEntering: ReturnType<typeof FadeIn.duration>;
  listExiting: ReturnType<typeof FadeOut.duration>;
};

/**
 * Drives list crossfade + a short window for per-row FadeInDown after swapKey changes.
 * Do not change swapKey on pagination appends.
 */
export function useListSwapAnimation(
  swapKey: string,
  options: Options = {}
): Result {
  const {
    fadeMs = LIST_SWAP_FADE_MS,
    gateMs = ROW_ENTER_GATE_MS,
    animateFirstMount = false,
  } = options;

  const [allowRowEntering, setAllowRowEntering] = useState(animateFirstMount);
  const isFirstMountRef = useRef(true);
  const gateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      if (!animateFirstMount) {
        setAllowRowEntering(false);
        return;
      }
    }

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
  }, [swapKey, gateMs, animateFirstMount]);

  return {
    allowRowEntering,
    listEntering: FadeIn.duration(fadeMs),
    listExiting: FadeOut.duration(fadeMs),
  };
}
