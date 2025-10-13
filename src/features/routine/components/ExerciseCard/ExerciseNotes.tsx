import React from "react";
import { StyleSheet, TextInput } from "react-native";
import { RFValue } from "react-native-responsive-fontsize";

interface Props {
  value: string;
  onChange: (text: string) => void;
  readonly?: boolean;
}

const ExerciseNotes = ({ value, onChange, readonly = false }: Props) => (
  <TextInput
    style={styles.noteInput}
    placeholder="Añadir nota..."
    value={value}
    onChangeText={onChange}
    editable={!readonly}
  />
);

const styles = StyleSheet.create({
  noteInput: {
    borderWidth: 0,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    backgroundColor: "#fafafc",
    fontSize: RFValue(16),
    color: "#333",
  },
});

export default ExerciseNotes;
