import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect } from "react";
import { InteractionManager, Platform, StatusBar, type StatusBarStyle } from "react-native";

const EDGE_STATUS_BAR = {
  animated: true,
  hidden: false,
  translucent: true,
  backgroundColor: "transparent",
} as const;

/** Re-assert after tab transitions; native screens may apply default "light" later. */
const ANDROID_REASSERT_MS = [0, 50, 150, 320, 600, 1000, 1500] as const;

/** Theme-aware icon style for content screens (not purple headers). */
export function themeBarStyle(isDark: boolean): StatusBarStyle {
  return isDark ? "light-content" : "dark-content";
}

/** Align @react-navigation/native-stack `statusBarStyle` with JS StatusBarStyle. */
export function nativeStackStatusBarStyle(
  isDark: boolean
): "light" | "dark" {
  return isDark ? "light" : "dark";
}

function pushEdgeBar(barStyle: StatusBarStyle) {
  return StatusBar.pushStackEntry({
    ...EDGE_STATUS_BAR,
    barStyle,
  });
}

function reassertAndroidBarStyle(entry: object, barStyle: StatusBarStyle) {
  const next = StatusBar.replaceStackEntry(entry, {
    ...EDGE_STATUS_BAR,
    animated: false,
    barStyle,
  });
  StatusBar.setBarStyle(barStyle, false);
  return next;
}

/**
 * Push a StatusBar stack entry while the screen is focused and pop it on blur.
 * Prefer push/pop over StatusBar.set* — the legacy setters are overwritten when
 * another tab's mounted <StatusBar> remounts (common with lazy bottom tabs).
 *
 * With app.json `edgeToEdgeEnabled: true`, never force `translucent={false}`.
 *
 * On Android, react-native-screens may re-apply a default "light" (white icons)
 * after fragment/header updates. Re-assert in place via replaceStackEntry so
 * any later overlay entry (e.g. Paywall) stays on top of the stack.
 */
export function useFocusedStatusBar(barStyle: StatusBarStyle): void {
  useFocusEffect(
    useCallback(() => {
      let entry = pushEdgeBar(barStyle);
      let cancelled = false;
      const timers: ReturnType<typeof setTimeout>[] = [];
      let interactionTask: { cancel: () => void } | undefined;

      if (Platform.OS === "android") {
        const scheduleReassert = (delayMs: number) => {
          timers.push(
            setTimeout(() => {
              if (cancelled) return;
              entry = reassertAndroidBarStyle(entry, barStyle);
            }, delayMs)
          );
        };

        ANDROID_REASSERT_MS.forEach(scheduleReassert);

        interactionTask = InteractionManager.runAfterInteractions(() => {
          if (cancelled) return;
          entry = reassertAndroidBarStyle(entry, barStyle);
          scheduleReassert(400);
        });
      }

      return () => {
        cancelled = true;
        timers.forEach(clearTimeout);
        interactionTask?.cancel();
        StatusBar.popStackEntry(entry);
      };
    }, [barStyle])
  );
}

/**
 * Push a StatusBar entry while an overlay/modal is active (not navigation-focused).
 * Pops when `active` becomes false or the host unmounts.
 */
export function useOverlayStatusBar(
  barStyle: StatusBarStyle,
  active: boolean
): void {
  useEffect(() => {
    if (!active) return;
    const entry = pushEdgeBar(barStyle);
    return () => {
      StatusBar.popStackEntry(entry);
    };
  }, [barStyle, active]);
}
