import { AlertTriangle } from "lucide-react-native";
import React from "react";
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import { useTheme } from "../../../contexts/ThemeContext";

interface Props {
  visible: boolean;
  duration: number; // en segundos
  onContinue: () => void;
  onDiscard: () => void;
  onSave: () => void;
}

const { width } = Dimensions.get("window");

export const ShortWorkoutConfirmModal = ({
  visible,
  duration,
  onContinue,
  onDiscard,
  onSave,
}: Props) => {
  const { theme, isDark } = useTheme();

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              borderWidth: isDark ? 1 : 0,
            },
          ]}
        >
          <View style={styles.iconContainer}>
            <AlertTriangle size={48} color="#F59E0B" />
          </View>

          <Text style={[styles.title, { color: theme.text }]}>
            ¿Entrenamiento corto?
          </Text>

          <Text style={[styles.message, { color: theme.textSecondary }]}>
            Tu entrenamiento ha durado solo{" "}
            <Text style={{ fontWeight: "bold", color: theme.text }}>
              {formatDuration(duration)}
            </Text>
            . ¿Qué deseas hacer?
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.primary }]}
              onPress={onContinue}
            >
              <Text style={styles.buttonTextPrimary}>Continuar entrenando</Text>
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
              <Text
                style={[styles.buttonTextSecondary, { color: theme.primary }]}
              >
                Guardar de todas formas
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { marginTop: 8 }]}
              onPress={onDiscard}
            >
              <Text
                style={[styles.buttonTextDestructive, { color: theme.error }]}
              >
                Descartar entrenamiento
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    width: Math.min(width - 40, 340),
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
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
    color: "#FFFFFF",
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
