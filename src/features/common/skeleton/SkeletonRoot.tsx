import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import { SkeletonPulseProvider } from "./SkeletonPulseContext";
import { useSkeletonPulse } from "./useSkeletonPulse";

const DEFAULT_ACCESSIBILITY_LABEL = "Cargando";

type SkeletonRootProps = {
  children: React.ReactNode;
  /** Spoken-only loading context for assistive tech (not shown visually). */
  message?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

function resolveAccessibilityLabel(
  accessibilityLabel?: string,
  message?: string
): string {
  const explicit = accessibilityLabel?.trim();
  if (explicit) return explicit;
  const fromMessage = message?.trim();
  if (fromMessage) return fromMessage;
  return DEFAULT_ACCESSIBILITY_LABEL;
}

export function SkeletonRoot({
  children,
  message,
  accessibilityLabel,
  style,
}: SkeletonRootProps) {
  const pulse = useSkeletonPulse();
  const label = resolveAccessibilityLabel(accessibilityLabel, message);

  return (
    <SkeletonPulseProvider value={pulse}>
      <View
        style={style}
        accessible
        accessibilityLabel={label}
        accessibilityState={{ busy: true }}
      >
        {children}
      </View>
    </SkeletonPulseProvider>
  );
}
