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
            <View key={note.id} style={styles.noteItem}>
              <View style={styles.noteContent}>
                <Text style={styles.noteText}>{note.text}</Text>
                <Text style={styles.noteDate}>
                  {formatDate(note.createdAt)}
                </Text>
              </View>
              {!readonly && (
                <TouchableOpacity
                  onPress={() => deleteNote(note.id)}
                  style={styles.deleteButton}
                >
                  <Icon name="close" size={18} color="#EF4444" />
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
                style={styles.noteInput}
                placeholder="Escribe tu nota..."
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
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={addNote}
                  style={[
                    styles.saveButton,
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
              style={styles.addNoteButton}
            >
              <Icon name="add" size={20} color="#6C3BAA" />
              <Text style={styles.addNoteButtonText}>
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
    backgroundColor: "#F3F4F6",
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
    color: "#333",
    lineHeight: RFValue(20),
  },
  noteDate: {
    fontSize: RFValue(11),
    color: "#6B7280",
    fontWeight: "500",
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  inputContainer: {
    gap: 8,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#FFFFFF",
    fontSize: RFValue(14),
    color: "#333",
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
    backgroundColor: "#F3F4F6",
  },
  cancelButtonText: {
    fontSize: RFValue(13),
    color: "#6B7280",
    fontWeight: "600",
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#6C3BAA",
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
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    gap: 6,
    borderStyle: "dashed",
  },
  addNoteButtonText: {
    fontSize: RFValue(13),
    color: "#6C3BAA",
    fontWeight: "600",
  },
});

export default ExerciseNotes;
