import React from "react";
import {
  Platform,
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
  subtitle?: string;
  started: boolean;
  routineId?: string;
  onStart?: () => void;
  onEdit?: () => void;
  onChangeTitle?: (text: string) => void;
  readonly?: boolean;
  hideActions?: boolean;
};

export const RoutineHeader: React.FC<Props> = ({
  routineTitle,
  subtitle,
  started,
  routineId,
  onStart,
  onEdit,
  onChangeTitle,
  readonly,
  hideActions = false,
}) => {
  const { theme } = useTheme();

  if (started) return null;

  return (
    <View style={styles.header}>
      {readonly ? (
        <>
          <Text style={[styles.title, { color: theme.text }]}>
            {routineTitle || "Rutina sin nombre"}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {subtitle}
            </Text>
          ) : null}
          {!hideActions && (
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[styles.startButton, { backgroundColor: theme.primary }]}
                onPress={onStart}
              >
                <Text style={styles.startButtonText}>Iniciar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.editButton,
                  { backgroundColor: theme.primary + "20" },
                  Platform.OS === "android" && styles.editButtonAndroid,
                ]}
                onPress={onEdit}
              >
                <Text style={[styles.editButtonText, { color: theme.primary }]}>
                  Editar
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      ) : (
        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.titleInput,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
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
  subtitle: {
    fontSize: RFValue(13),
    textAlign: "center",
    marginBottom: 12,
    fontWeight: "500",
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
  editButtonAndroid: {
    elevation: 0,
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
