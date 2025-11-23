import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import Icon from "react-native-vector-icons/MaterialIcons";
import uuid from "react-native-uuid";
import { useTheme } from "../../../../contexts/ThemeContext";

export interface ExerciseNote {
  id: string;
  text: string;
  createdAt: string;
}

interface Props {
  notes: ExerciseNote[];
  onChange: (notes: ExerciseNote[]) => void;
  readonly?: boolean;
}

const ExerciseNotes = ({ notes = [], onChange, readonly = false }: Props) => {
  const { theme } = useTheme();
  const [newNoteText, setNewNoteText] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const addNote = () => {
    if (!newNoteText.trim()) return;

    const newNote: ExerciseNote = {
      id: uuid.v4() as string,
      text: newNoteText.trim(),
      createdAt: new Date().toISOString(),
    };

    onChange([...notes, newNote]);
    setNewNoteText("");
    setIsAdding(false);
  };

  const deleteNote = (noteId: string) => {
    onChange(notes.filter((note) => note.id !== noteId));
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <View style={styles.container}>
      {/* Lista de notas existentes */}
      {notes.length > 0 && (
        <View style={styles.notesList}>
          {notes.map((note) => (
            <View key={note.id} style={[styles.noteItem, { backgroundColor: theme.backgroundSecondary }]}>
              <View style={styles.noteContent}>
                <Text style={[styles.noteText, { color: theme.text }]}>{note.text}</Text>
                <Text style={[styles.noteDate, { color: theme.textSecondary }]}>
                  {formatDate(note.createdAt)}
                </Text>
              </View>
              {!readonly && (
                <TouchableOpacity
                  onPress={() => deleteNote(note.id)}
                  style={[styles.deleteButton, { backgroundColor: theme.error + '20' }]}
                >
                  <Icon name="close" size={18} color={theme.error} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Input para nueva nota */}
      {!readonly && (
        <>
          {isAdding ? (
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.noteInput, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text }]}
                placeholder="Escribe tu nota..."
                placeholderTextColor={theme.textTertiary}
                value={newNoteText}
                onChangeText={setNewNoteText}
                multiline
                autoFocus
              />
              <View style={styles.inputActions}>
                <TouchableOpacity
                  onPress={() => {
                    setIsAdding(false);
                    setNewNoteText("");
                  }}
                  style={[styles.cancelButton, { backgroundColor: theme.backgroundSecondary }]}
                >
                  <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={addNote}
                  style={[
                    styles.saveButton,
                    { backgroundColor: theme.primary },
                    !newNoteText.trim() && styles.saveButtonDisabled,
                  ]}
                  disabled={!newNoteText.trim()}
                >
                  <Text style={styles.saveButtonText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setIsAdding(true)}
              style={[styles.addNoteButton, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
            >
              <Icon name="add" size={20} color={theme.primary} />
              <Text style={[styles.addNoteButtonText, { color: theme.primary }]}>
                {notes.length > 0 ? "Añadir otra nota" : "Añadir nota"}
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  notesList: {
    gap: 8,
    marginBottom: 12,
  },
  noteItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  noteContent: {
    flex: 1,
    gap: 4,
  },
  noteText: {
    fontSize: RFValue(14),
    lineHeight: RFValue(20),
  },
  noteDate: {
    fontSize: RFValue(11),
    fontWeight: "500",
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  inputContainer: {
    gap: 8,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: RFValue(14),
    minHeight: 80,
    textAlignVertical: "top",
  },
  inputActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: RFValue(13),
    fontWeight: "600",
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    backgroundColor: "#D1D5DB",
  },
  saveButtonText: {
    fontSize: RFValue(13),
    color: "#FFFFFF",
    fontWeight: "600",
  },
  addNoteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    borderStyle: "dashed",
  },
  addNoteButtonText: {
    fontSize: RFValue(13),
    fontWeight: "600",
  },
});

export default ExerciseNotes;
