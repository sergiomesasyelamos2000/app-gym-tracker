import React from "react";
import { Animated, StyleSheet } from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import { useTheme } from "../../../contexts/ThemeContext";
import { useSkeletonPulseContext } from "./SkeletonPulseContext";

type SkeletonMessageProps = {
  children: string;
};

export function SkeletonMessage({ children }: SkeletonMessageProps) {
  const { theme } = useTheme();
  const pulse = useSkeletonPulseContext();

  return (
    <Animated.Text
      style={[styles.message, { color: theme.textSecondary, opacity: pulse }]}
      numberOfLines={2}
    >
      {children}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  message: {
    textAlign: "center",
    fontSize: RFValue(14),
    marginBottom: 12,
  },
});
