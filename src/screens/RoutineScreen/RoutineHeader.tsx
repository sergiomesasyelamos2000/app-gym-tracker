import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

type Props = {
  routineTitle: string;
  started: boolean;
  routineId?: string;
  onStart?: () => void;
  onEdit?: () => void;
  onChangeTitle?: (text: string) => void;
};

export const RoutineHeader: React.FC<Props> = ({
  routineTitle,
  started,
  routineId,
  onStart,
  onEdit,
  onChangeTitle,
}) => {
  if (started) return null;

  return (
    <View style={styles.header}>
      <Text style={styles.title}>{routineTitle || "Nueva rutina"}</Text>
      {routineId ? (
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.startButton} onPress={onStart}>
            <Text style={styles.startButtonText}>Iniciar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editButton} onPress={onEdit}>
            <Text style={styles.editButtonText}>Editar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.titleInput}
            placeholder="Nombre de la rutina"
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
    fontSize: 26,
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
    fontSize: 15,
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
    fontSize: 15,
    letterSpacing: 0.5,
  },
  inputContainer: { marginTop: 12, alignItems: "center" },
  titleInput: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    elevation: 2,
    fontSize: 16,
    color: "#333",
    width: "95%",
    borderWidth: 1,
    borderColor: "#EDEAF6",
  },
});
