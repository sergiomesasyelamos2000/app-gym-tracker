import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TextInput, Checkbox } from 'react-native-paper';
import { SetData } from './ExerciseCard';

interface Props {
  set: SetData;
  onToggleCompleted: () => void;
  onUpdateField: (id: string, field: keyof SetData, value: any) => void;
}

const SetRow = ({ set, onToggleCompleted, onUpdateField }: Props) => {
  return (
    <View style={[styles.row, set.completed && styles.rowCompleted]}>
      <Text style={styles.cell}>{set.label || '-'}</Text>
      <Text style={styles.cell}>{set.previous || '-'}</Text>

      <TextInput
        mode="outlined"
        style={styles.input}
        keyboardType="numeric"
        value={set.kg?.toString() || ''}
        onChangeText={(val) => onUpdateField(set.id, 'kg', Number(val))}
      />

      <TextInput
        mode="outlined"
        style={styles.input}
        keyboardType="numeric"
        value={set.reps?.toString() || ''}
        onChangeText={(val) => onUpdateField(set.id, 'reps', Number(val))}
      />

      <Checkbox
        status={set.completed ? 'checked' : 'unchecked'}
        onPress={onToggleCompleted}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    backgroundColor: '#ECFCCB',
    borderRadius: 6,
    paddingVertical: 4,
  },
  rowCompleted: {
    backgroundColor: '#BBF7D0',
  },
  cell: {
    width: 40,
    textAlign: 'center',
  },
  input: {
    width: 60,
    marginHorizontal: 4,
  },
});

export default SetRow;
