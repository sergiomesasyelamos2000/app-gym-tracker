import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { Platform, StatusBar, type StatusBarStyle } from "react-native";

/**
 * Apply StatusBar style while the screen is focused.
 * With app.json `edgeToEdgeEnabled: true`, never force `translucent={false}` —
 * that leaves Android without a visible status bar after the screen is popped.
 */
export function useFocusedStatusBar(barStyle: StatusBarStyle): void {
  useFocusEffect(
    useCallback(() => {
      StatusBar.setHidden(false);
      StatusBar.setBarStyle(barStyle, true);
      if (Platform.OS === "android") {
        StatusBar.setTranslucent(true);
        StatusBar.setBackgroundColor("transparent");
      }
      return () => {
        StatusBar.setHidden(false);
      };
    }, [barStyle])
  );
}
