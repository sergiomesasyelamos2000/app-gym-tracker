import { useNavigation } from "@react-navigation/native";
import {
  ArrowLeft,
  Calendar,
  Download,
  FileJson,
  FileText,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../../contexts/ThemeContext";
import {
  DataType,
  ExportFormat,
  exportService,
} from "../../../services/exportService";

export default function ExportDataScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);

  // State
  const [startDate, setStartDate] = useState(
    new Date(new Date().setMonth(new Date().getMonth() - 1)),
  );
  const [endDate, setEndDate] = useState(new Date());
  const [dataType, setDataType] = useState<DataType>("all");
  const [format, setFormat] = useState<ExportFormat>("json");

  // Date Picker State
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<"start" | "end">(
    "start",
  );

  const showDatePicker = (mode: "start" | "end") => {
    setDatePickerMode(mode);
    setDatePickerVisibility(true);
  };

  const hideDatePicker = () => {
    setDatePickerVisibility(false);
  };

  const handleConfirmDate = (date: Date) => {
    if (datePickerMode === "start") {
      setStartDate(date);
    } else {
      setEndDate(date);
    }
    hideDatePicker();
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      await exportService.exportData({
        startDate,
        endDate,
        dataType,
        format,
      });
      Alert.alert("Éxito", "Datos exportados correctamente");
    } catch (error) {
      Alert.alert("Error", "No se pudieron exportar los datos");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("es-ES");
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeft color={theme.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Exportar Datos
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          RANGO DE FECHAS
        </Text>

        <View style={styles.dateContainer}>
          <TouchableOpacity
            style={[
              styles.dateButton,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
            onPress={() => showDatePicker("start")}
          >
            <Calendar size={20} color={theme.primary} />
            <View>
              <Text style={[styles.dateLabel, { color: theme.textSecondary }]}>
                Desde
              </Text>
              <Text style={[styles.dateValue, { color: theme.text }]}>
                {formatDate(startDate)}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.dateButton,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
            onPress={() => showDatePicker("end")}
          >
            <Calendar size={20} color={theme.primary} />
            <View>
              <Text style={[styles.dateLabel, { color: theme.textSecondary }]}>
                Hasta
              </Text>
              <Text style={[styles.dateValue, { color: theme.text }]}>
                {formatDate(endDate)}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          TIPO DE DATOS
        </Text>
        <View style={styles.optionsContainer}>
          {(["all", "workouts", "nutrition"] as DataType[]).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.optionButton,
                dataType === type && { backgroundColor: theme.primary },
                { borderColor: theme.border },
              ]}
              onPress={() => setDataType(type)}
            >
              <Text
                style={[
                  styles.optionText,
                  { color: dataType === type ? "#fff" : theme.text },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {type === "all"
                  ? "Todo"
                  : type === "workouts"
                    ? "Entrenamientos"
                    : "Nutrición"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          FORMATO
        </Text>
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[
              styles.formatButton,
              format === "json" && {
                borderColor: theme.primary,
                backgroundColor: theme.card,
              },
              { borderColor: theme.border },
            ]}
            onPress={() => setFormat("json")}
          >
            <FileJson
              size={24}
              color={format === "json" ? theme.primary : theme.textSecondary}
            />
            <Text style={[styles.formatText, { color: theme.text }]}>JSON</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.formatButton,
              format === "csv" && {
                borderColor: theme.primary,
                backgroundColor: theme.card,
              },
              { borderColor: theme.border },
            ]}
            onPress={() => setFormat("csv")}
          >
            <FileText
              size={24}
              color={format === "csv" ? theme.primary : theme.textSecondary}
            />
            <Text style={[styles.formatText, { color: theme.text }]}>CSV</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.exportButton, { backgroundColor: theme.primary }]}
          onPress={handleExport}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Download color="#fff" size={20} style={{ marginRight: 8 }} />
              <Text style={styles.exportButtonText}>Exportar Archivo</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={[styles.infoText, { color: theme.textSecondary }]}>
          El archivo se guardará en tu dispositivo y podrás compartirlo o
          guardarlo en la nube.
        </Text>
      </ScrollView>

      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={handleConfirmDate}
        onCancel={hideDatePicker}
        date={datePickerMode === "start" ? startDate : endDate}
        locale="es_ES"
        confirmTextIOS="Confirmar"
        cancelTextIOS="Cancelar"
        headerTextIOS="Seleccionar fecha"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 12,
    marginTop: 20,
    letterSpacing: 1,
  },
  dateContainer: {
    flexDirection: "row",
    gap: 12,
  },
  dateButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  dateLabel: {
    fontSize: 12,
  },
  dateValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  optionsContainer: {
    flexDirection: "row",
    gap: 12,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    borderWidth: 1,
  },
  optionText: {
    fontWeight: "600",
    fontSize: 13,
    textAlign: "center",
  },
  formatButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  formatText: {
    fontSize: 16,
    fontWeight: "600",
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    borderRadius: 16,
    marginTop: 40,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  exportButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  infoText: {
    textAlign: "center",
    marginTop: 16,
    fontSize: 12,
  },
});
