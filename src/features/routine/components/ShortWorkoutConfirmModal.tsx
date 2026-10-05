import { AlertTriangle } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import { useTheme } from "../../../contexts/ThemeContext";
import { AppDialog } from "../../../ui/modal";

interface Props {
  visible: boolean;
  duration: number;
  /** When true, copy focuses on missing completed sets instead of short duration. */
  noCompletedSets?: boolean;
  onContinue: () => void;
  onDiscard: () => void;
  onSave: () => void;
}

export const ShortWorkoutConfirmModal = ({
  visible,
  duration,
  noCompletedSets = false,
  onContinue,
  onDiscard,
  onSave,
}: Props) => {
  const { theme } = useTheme();

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const title = noCompletedSets
    ? "¿Guardar entrenamiento?"
    : "¿Entrenamiento corto?";

  const message = noCompletedSets ? (
    <>No has completado ninguna serie. ¿Qué deseas hacer?</>
  ) : (
    <>
      Tu entrenamiento ha durado solo{" "}
      <Text style={{ fontWeight: "bold", color: theme.text }}>
        {formatDuration(duration)}
      </Text>
      . ¿Qué deseas hacer?
    </>
  );

  return (
    <AppDialog
      visible={visible}
      onDismiss={() => onContinue()}
      maxWidth={340}
      contentStyle={styles.content}
      testID="short-workout-confirm"
    >
      <View style={styles.iconContainer}>
        <AlertTriangle size={48} color="#F59E0B" />
      </View>

      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>

      <Text style={[styles.message, { color: theme.textSecondary }]}>
        {message}
      </Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={onContinue}
        >
          <Text style={[styles.buttonTextPrimary, { color: theme.onPrimary }]}>
            Continuar entrenando
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: "transparent",
              borderWidth: 1,
              borderColor: theme.primary,
            },
          ]}
          onPress={onSave}
        >
          <Text style={[styles.buttonTextSecondary, { color: theme.primary }]}>
            Guardar de todas formas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { marginTop: 8 }]}
          onPress={onDiscard}
        >
          <Text style={[styles.buttonTextDestructive, { color: theme.error }]}>
            Descartar entrenamiento
          </Text>
        </TouchableOpacity>
      </View>
    </AppDialog>
  );
};

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: 16,
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    padding: 16,
    borderRadius: 50,
  },
  title: {
    fontSize: RFValue(20),
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    fontSize: RFValue(14),
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  buttonContainer: {
    width: "100%",
    gap: 12,
  },
  button: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonTextPrimary: {
    fontSize: RFValue(14),
    fontWeight: "600",
  },
  buttonTextSecondary: {
    fontSize: RFValue(14),
    fontWeight: "600",
  },
  buttonTextDestructive: {
    fontSize: RFValue(14),
    fontWeight: "500",
  },
});
