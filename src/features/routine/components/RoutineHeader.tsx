import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import { useTheme } from "../../../contexts/ThemeContext";

type Props = {
  routineTitle: string;
  started: boolean;
  routineId?: string;
  onStart?: () => void;
  onEdit?: () => void;
  onChangeTitle?: (text: string) => void;
  readonly?: boolean;
};

export const RoutineHeader: React.FC<Props> = ({
  routineTitle,
  started,
  routineId,
  onStart,
  onEdit,
  onChangeTitle,
  readonly,
}) => {
  const { theme } = useTheme();

  if (started) return null;

  return (
    <View style={styles.header}>
      {routineId && readonly ? (
        <>
          <Text style={[styles.title, { color: theme.text }]}>
            {routineTitle || "Rutina sin nombre"}
          </Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={[styles.startButton, { backgroundColor: theme.primary }]} onPress={onStart}>
              <Text style={styles.startButtonText}>Iniciar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.editButton, { backgroundColor: theme.primary + '20' }]} onPress={onEdit}>
              <Text style={[styles.editButtonText, { color: theme.primary }]}>Editar</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.titleInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
            placeholder="Nombre de la rutina"
            placeholderTextColor={theme.textTertiary}
            value={routineTitle}
            onChangeText={onChangeTitle}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: { marginBottom: 16, paddingHorizontal: 8, paddingTop: 16 },
  title: {
    fontSize: RFValue(26),
    fontWeight: "bold",
    color: "#222",
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 8,
  },
  startButton: {
    backgroundColor: "#6C3BAA",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    alignItems: "center",
    elevation: 2,
  },
  startButtonText: {
    color: "#fff",
    fontSize: RFValue(15),
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  editButton: {
    backgroundColor: "#EDEAF6",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    alignItems: "center",
    elevation: 2,
  },
  editButtonText: {
    color: "#6C3BAA",
    fontWeight: "bold",
    fontSize: RFValue(15),
    letterSpacing: 0.5,
  },
  inputContainer: { marginTop: 12, alignItems: "center" },
  titleInput: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    elevation: 2,
    fontSize: RFValue(16),
    color: "#333",
    width: "95%",
    borderWidth: 1,
    borderColor: "#EDEAF6",
  },
});
