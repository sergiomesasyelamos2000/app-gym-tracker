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
  repsType: "reps" | "range"; // 👈 agregar
}

const ExerciseSetRow = ({ item, onUpdate, repsType }: Props) => {
  const handleMinRepsChange = (text: string) => {
    const repsMin = Number(text);
    onUpdate(item.id, "repsMin", isNaN(repsMin) ? 0 : repsMin);
  };

  const handleMaxRepsChange = (text: string) => {
    const repsMax = Number(text);
    onUpdate(item.id, "repsMax", isNaN(repsMax) ? 0 : repsMax);
  };

  const handleSingleRepsChange = (text: string) => {
    const reps = Number(text);
    onUpdate(item.id, "reps", isNaN(reps) ? 0 : reps);
  };

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { flex: 1 }]}>{item.order}</Text>

      {/* Peso */}
      <TextInput
        style={[styles.input, { flex: 2 }]}
        keyboardType="numeric"
        value={item.weight?.toString()}
        placeholder="Kg"
        placeholderTextColor="#999"
        onChangeText={(text) => {
          const weight = Number(text);
          onUpdate(item.id, "weight", isNaN(weight) ? 0 : weight);
        }}
      />

      {/* Repeticiones */}
      {repsType === "range" ? (
        <View style={[styles.rangeContainer, { flex: 2 }]}>
          <TextInput
            style={[styles.rangeInput, { flex: 1 }]}
            keyboardType="numeric"
            value={item.repsMin?.toString() || ""}
            placeholder="8"
            placeholderTextColor="#999"
            onChangeText={handleMinRepsChange}
          />
          <Text style={styles.rangeSeparator}>-</Text>
          <TextInput
            style={[styles.rangeInput, { flex: 1 }]}
            keyboardType="numeric"
            value={item.repsMax?.toString() || ""}
            placeholder="10"
            placeholderTextColor="#999"
            onChangeText={handleMaxRepsChange}
          />
        </View>
      ) : (
        <TextInput
          style={[styles.input, { flex: 2 }]}
          keyboardType="numeric"
          value={item.reps?.toString() || ""}
          placeholder="Reps"
          placeholderTextColor="#999"
          onChangeText={handleSingleRepsChange}
        />
      )}

      {/* Check */}
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
};

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
  input: {
    backgroundColor: "#e8e8ed",
    borderRadius: 12,
    padding: 8,
    marginHorizontal: 6,
    textAlign: "center",
    fontSize: 15,
    color: "#333",
  },
  rangeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8e8ed",
    borderRadius: 12,
    paddingHorizontal: 4,
    marginHorizontal: 6,
  },
  rangeInput: {
    textAlign: "center",
    padding: 8,
    fontSize: 15,
    color: "#333",
  },
  rangeSeparator: {
    marginHorizontal: 4,
    fontSize: 16,
    color: "#555",
  },
  label: {
    textAlign: "center",
    fontWeight: "500",
    color: "#444",
    fontSize: 15,
  },
});

export default ExerciseSetRow;
