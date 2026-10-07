import React, { useEffect, useState } from "react";
import {
  Platform,
  RefreshControl as NativeRefreshControl,
  type RefreshControlProps,
} from "react-native";
import { RefreshControl as GestureHandlerRefreshControl } from "react-native-gesture-handler";
import { useTheme } from "../../../contexts/ThemeContext";

export type AppRefreshControlProps = RefreshControlProps & {
  /**
   * Set on lists backed by react-native-gesture-handler (e.g. DraggableFlatList)
   * so pull-to-refresh cooperates with gestures. Default: plain RN ScrollView/FlatList.
   */
  gestureHandler?: boolean;
};

/**
 * On iOS + New Architecture, UIRefreshControl often ignores the initial tintColor.
 * First commit omits tint; the next frame applies the brand color so Fabric treats
 * it as an update. Android receives the color immediately.
 */
function useIosDeferredTint(color: string): string | undefined {
  const [deferred, setDeferred] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    const frame = requestAnimationFrame(() => setDeferred(color));
    return () => cancelAnimationFrame(frame);
  }, [color]);

  if (Platform.OS !== "ios") return color;
  return deferred;
}

/**
 * Themed pull-to-refresh. Uses RN RefreshControl by default (stable on Android).
 * Pass gestureHandler for RNGH-backed lists (iOS tint + gesture ref wiring).
 */
export function AppRefreshControl({
  gestureHandler = false,
  tintColor,
  titleColor,
  colors,
  progressBackgroundColor,
  ...rest
}: AppRefreshControlProps) {
  const { theme } = useTheme();
  const spinnerColor = tintColor ?? theme.primary;
  const iosTintColor = useIosDeferredTint(spinnerColor);
  const Control = gestureHandler
    ? GestureHandlerRefreshControl ?? NativeRefreshControl
    : NativeRefreshControl;

  return (
    <Control
      {...rest}
      tintColor={Platform.OS === "ios" ? iosTintColor : spinnerColor}
      titleColor={titleColor ?? spinnerColor}
      colors={colors ?? [spinnerColor]}
      progressBackgroundColor={progressBackgroundColor ?? theme.card}
    />
  );
}
