import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TextInput } from 'react-native-paper';

interface Props {
  title: string;
  notes: string;
  setNotes: (val: string) => void;
  rest: number;
  setRest: (val: number) => void;
}

const HeaderSection = ({ title, notes, setNotes, rest, setRest }: Props) => (
  <View>
    <Text style={styles.title}>{title}</Text>
    <TextInput
      mode="outlined"
      label="Add notes here..."
      value={notes}
      onChangeText={setNotes}
      style={styles.input}
    />
    <Text style={styles.timerLabel}>Rest Timer: {rest}s</Text>
    <TextInput
      mode="outlined"
      keyboardType="numeric"
      value={String(rest)}
      onChangeText={(val) => setRest(Number(val))}
      style={styles.input}
    />
  </View>
);

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  input: { marginBottom: 8 },
  timerLabel: { marginTop: 4, marginBottom: 4, color: 'blue' },
});

export default HeaderSection;
