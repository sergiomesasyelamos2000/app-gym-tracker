import React, { memo, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../../contexts/ThemeContext";
import {
  getPasswordRequirementStatus,
  passwordsMatch,
} from "../utils/passwordValidation";

export type PasswordRequirementsHintProps = {
  password: string;
  confirmPassword: string;
  /** Show requirement checklist (under password field). */
  showRequirements: boolean;
  /** Show match line (under confirm field). */
  showMatch: boolean;
};

function PasswordRequirementsHintComponent({
  password,
  confirmPassword,
  showRequirements,
  showMatch,
}: PasswordRequirementsHintProps) {
  const { theme } = useTheme();
  const requirements = useMemo(
    () => getPasswordRequirementStatus(password),
    [password]
  );
  const match = passwordsMatch(password, confirmPassword);
  const confirmStarted = confirmPassword.length >= 2;

  if (!showRequirements && !showMatch) {
    return null;
  }

  return (
    <View style={styles.container} accessibilityRole="summary">
      {showRequirements && (
        <View style={styles.list}>
          {requirements.map((item) => {
            const color = item.met ? theme.success : theme.textSecondary;
            return (
              <View key={item.id} style={styles.row}>
                <Text style={[styles.mark, { color }]}>
                  {item.met ? "✓" : "○"}
                </Text>
                <Text style={[styles.label, { color }]}>{item.label}</Text>
              </View>
            );
          })}
        </View>
      )}

      {showMatch && confirmStarted && (
        <Text
          style={[
            styles.match,
            {
              color: match ? theme.success : theme.error,
            },
          ]}
        >
          {match
            ? "Las contraseñas coinciden"
            : "Las contraseñas no coinciden"}
        </Text>
      )}
    </View>
  );
}

export const PasswordRequirementsHint = memo(PasswordRequirementsHintComponent);

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  list: {
    gap: 3,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mark: {
    fontSize: 12,
    fontWeight: "700",
    width: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
  },
  match: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
});
