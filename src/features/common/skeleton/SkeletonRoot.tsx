import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import { SkeletonMessage } from "./SkeletonMessage";
import { SkeletonPulseProvider } from "./SkeletonPulseContext";
import { useSkeletonPulse } from "./useSkeletonPulse";

type SkeletonRootProps = {
  children: React.ReactNode;
  message?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  /** Place the status message above children (default) or below. */
  messagePosition?: "above" | "below";
};

export function SkeletonRoot({
  children,
  message,
  accessibilityLabel,
  style,
  messagePosition = "above",
}: SkeletonRootProps) {
  const pulse = useSkeletonPulse();
  const label = accessibilityLabel ?? message;

  return (
    <SkeletonPulseProvider value={pulse}>
      <View
        style={style}
        accessibilityLabel={label}
        accessibilityState={{ busy: true }}
      >
        {message && messagePosition === "above" ? (
          <SkeletonMessage>{message}</SkeletonMessage>
        ) : null}
        {children}
        {message && messagePosition === "below" ? (
          <SkeletonMessage>{message}</SkeletonMessage>
        ) : null}
      </View>
    </SkeletonPulseProvider>
  );
}
