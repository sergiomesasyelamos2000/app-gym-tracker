import { Plus } from "lucide-react-native";
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
  addedCount: number;
  onUpdate: () => void;
  onKeepOriginal: () => void;
}

const { width } = Dimensions.get("window");

export const UpdateRoutineConfirmModal = ({
  visible,
  addedCount,
  onUpdate,
  onKeepOriginal,
}: Props) => {
  const { theme, isDark } = useTheme();
  const addedLabel =
    addedCount === 1
      ? "Has añadido un ejercicio."
      : `Has añadido ${addedCount} ejercicios.`;

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
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${theme.primary}1A` },
            ]}
          >
            <Plus size={48} color={theme.primary} />
          </View>

          <Text style={[styles.title, { color: theme.text }]}>
            Ejercicio añadido
          </Text>

          <Text style={[styles.message, { color: theme.textSecondary }]}>
            {addedLabel} ¿Quieres actualizar la rutina o mantener la rutina
            original?
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.primary }]}
              onPress={onUpdate}
            >
              <Text
                style={[styles.buttonTextPrimary, { color: theme.onPrimary }]}
              >
                Actualizar rutina
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
              onPress={onKeepOriginal}
            >
              <Text
                style={[styles.buttonTextSecondary, { color: theme.primary }]}
              >
                Mantener original
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
});
