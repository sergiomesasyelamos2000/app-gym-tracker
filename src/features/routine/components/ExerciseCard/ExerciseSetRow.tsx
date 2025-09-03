import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { SetRequestDto } from "../../../../models";

interface Props {
  item: SetRequestDto;
  onUpdate: (
    id: string,
    field: keyof SetRequestDto,
    value: number | boolean
  ) => void;
}

const ExerciseSetRow = ({ item, onUpdate }: Props) => (
  <View style={styles.row}>
    <Text style={[styles.label, { flex: 1 }]}>{item.order}</Text>

    <TextInput
      style={[styles.input, { flex: 2 }]}
      keyboardType="numeric"
      value={item.weight?.toString()}
      onChangeText={(text) => onUpdate(item.id, "weight", parseInt(text) || 0)}
    />

    <TextInput
      style={[styles.input, { flex: 2 }]}
      keyboardType="numeric"
      value={item.reps?.toString()}
      onChangeText={(text) => onUpdate(item.id, "reps", parseInt(text) || 0)}
    />

    <TouchableOpacity
      style={{ flex: 1 }}
      onPress={() => onUpdate(item.id, "completed", !item.completed)}
    >
      <Icon
        name={item.completed ? "check-circle" : "radio-button-unchecked"}
        size={24}
        color={item.completed ? "#4CAF50" : "#9E9E9E"}
      />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: "#f9f9f9",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  label: {
    textAlign: "center",
    fontWeight: "500",
    color: "#444",
    fontSize: 15,
  },
  input: {
    backgroundColor: "#e8e8ed",
    borderRadius: 12,
    padding: 8,
    marginHorizontal: 6,
    textAlign: "center",
    fontSize: 15,
    color: "#333",
  },
});

export default ExerciseSetRow;
