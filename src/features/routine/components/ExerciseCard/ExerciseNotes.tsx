import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import uuid from "react-native-uuid";
import Icon from "react-native-vector-icons/MaterialIcons";
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

  return (
    <View style={styles.container}>
      {notes.length > 0 && (
        <View style={styles.notesList}>
          {notes.map((note) => (
            <View key={note.id} style={styles.noteItem}>
              <Text style={[styles.noteText, { color: theme.textSecondary }]}>
                {note.text}
              </Text>
              {!readonly && (
                <TouchableOpacity
                  onPress={() => deleteNote(note.id)}
                  hitSlop={8}
                  accessibilityLabel="Eliminar nota"
                >
                  <Icon name="close" size={16} color={theme.textTertiary} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      {!readonly && (
        <>
          {isAdding ? (
            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.noteInput,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                placeholder="Agregar notas aquí…"
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
                  style={styles.cancelButton}
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
                <TouchableOpacity
                  onPress={addNote}
                  style={[
                    styles.saveButton,
                    { backgroundColor: theme.primary },
                    !newNoteText.trim() && styles.saveButtonDisabled,
                  ]}
                  disabled={!newNoteText.trim()}
                >
                  <Text
                    style={[styles.saveButtonText, { color: theme.onPrimary }]}
                  >
                    Guardar
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setIsAdding(true)}
              accessibilityLabel="Agregar notas"
            >
              <Text
                style={[styles.placeholder, { color: theme.textTertiary }]}
              >
                {notes.length > 0
                  ? "Agregar otra nota…"
                  : "Agregar notas aquí…"}
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
    marginBottom: 6,
  },
  notesList: {
    gap: 4,
    marginBottom: 4,
  },
  noteItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  noteText: {
    flex: 1,
    fontSize: RFValue(13),
    lineHeight: RFValue(18),
  },
  inputContainer: {
    gap: 8,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: RFValue(14),
    minHeight: 64,
    textAlignVertical: "top",
  },
  inputActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelButtonText: {
    fontSize: RFValue(13),
    fontWeight: "600",
  },
  saveButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: RFValue(13),
    fontWeight: "600",
  },
  placeholder: {
    fontSize: RFValue(13),
    fontStyle: "italic",
    paddingVertical: 2,
  },
});

export default ExerciseNotes;
