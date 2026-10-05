import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { StatusBar, type StatusBarStyle } from "react-native";

/**
 * Push a StatusBar stack entry while the screen is focused and pop it on blur.
 * Prefer push/pop over StatusBar.set* — the legacy setters are overwritten when
 * another tab's mounted <StatusBar> remounts (common with lazy bottom tabs).
 *
 * With app.json `edgeToEdgeEnabled: true`, never force `translucent={false}`.
 */
export function useFocusedStatusBar(barStyle: StatusBarStyle): void {
  useFocusEffect(
    useCallback(() => {
      const entry = StatusBar.pushStackEntry({
        animated: true,
        hidden: false,
        barStyle,
        translucent: true,
        backgroundColor: "transparent",
      });
      return () => {
        StatusBar.popStackEntry(entry);
      };
    }, [barStyle])
  );
}
