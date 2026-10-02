import React from "react";
import {
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
  const Control = gestureHandler
    ? GestureHandlerRefreshControl ?? NativeRefreshControl
    : NativeRefreshControl;

  return (
    <Control
      {...rest}
      tintColor={spinnerColor}
      titleColor={titleColor ?? spinnerColor}
      colors={colors ?? [spinnerColor]}
      progressBackgroundColor={progressBackgroundColor ?? theme.card}
    />
  );
}
