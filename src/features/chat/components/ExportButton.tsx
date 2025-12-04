import React, { useState } from "react";
import {
  TouchableOpacity,
  StyleSheet,
  Modal,
  View,
  Text,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../contexts/ThemeContext";
import { exportToCSV, exportToPDF } from "../../../utils/exportUtils";
import { useAuthStore } from "../../../store/useAuthStore";

interface ExportButtonProps {
  content: string;
  title?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  content,
  title = "Plan de Nutrición",
}) => {
  const { theme } = useTheme();
  const user = useAuthStore((state) => state.user);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleExportCSV = async () => {
    setModalVisible(false);
    setLoading(true);
    try {
      await exportToCSV(content, title.replace(/\s+/g, "_"));
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setModalVisible(false);
    setLoading(true);
    try {
      await exportToPDF(content, title, user?.name);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.exportButton, { backgroundColor: theme.primary }]}
        onPress={() => setModalVisible(true)}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="download-outline" size={16} color="#fff" />
            <Text style={styles.exportButtonText}>Exportar</Text>
          </>
        )}
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View
            style={[styles.modalContent, { backgroundColor: theme.card }]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Exportar Dieta
            </Text>
            <Text
              style={[styles.modalSubtitle, { color: theme.textSecondary }]}
            >
              Selecciona el formato de exportación
            </Text>

            <TouchableOpacity
              style={[
                styles.optionButton,
                { backgroundColor: theme.background },
              ]}
              onPress={handleExportPDF}
            >
              <Ionicons name="document-text" size={24} color={theme.primary} />
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, { color: theme.text }]}>
                  PDF
                </Text>
                <Text
                  style={[
                    styles.optionDescription,
                    { color: theme.textSecondary },
                  ]}
                >
                  Formato profesional con diseño
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.textTertiary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionButton,
                { backgroundColor: theme.background },
              ]}
              onPress={handleExportCSV}
            >
              <Ionicons name="grid" size={24} color={theme.primary} />
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, { color: theme.text }]}>
                  CSV
                </Text>
                <Text
                  style={[
                    styles.optionDescription,
                    { color: theme.textSecondary },
                  ]}
                >
                  Para Excel o Google Sheets
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.textTertiary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: theme.border }]}
              onPress={() => setModalVisible(false)}
            >
              <Text
                style={[
                  styles.cancelButtonText,
                  { color: theme.textSecondary },
                ]}
              >
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
    gap: 4,
  },
  exportButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 12,
  },
  cancelButton: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
