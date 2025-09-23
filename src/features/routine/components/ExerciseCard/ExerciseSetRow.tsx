import React, { useState, useEffect } from "react";
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
    value: number | boolean | undefined
  ) => void;
  repsType: "reps" | "range";
  readonly?: boolean;
  previousMark?: string;
  started?: boolean;
}

const ExerciseSetRow = ({
  item,
  onUpdate,
  repsType,
  readonly = false,
  previousMark,
  started = false,
}: Props) => {
  // Estados locales independientes - fuente única de verdad
  const [localWeight, setLocalWeight] = useState<string>(
    started ? "" : item.weight?.toString() || ""
  );
  const [localReps, setLocalReps] = useState<string>(
    started ? "" : item.reps?.toString() || ""
  );
  const [localRepsMin, setLocalRepsMin] = useState<string>(
    started ? "" : item.repsMin?.toString() || ""
  );
  const [localRepsMax, setLocalRepsMax] = useState<string>(
    started ? "" : item.repsMax?.toString() || ""
  );

  // Solo sincronizar con el item cuando started cambia
  useEffect(() => {
    if (started) {
      // Modo started: vaciar los inputs
      setLocalWeight("");
      setLocalReps("");
      setLocalRepsMin("");
      setLocalRepsMax("");
    } else {
      // Modo edición: cargar valores del item
      setLocalWeight(item.weight?.toString() || "");
      setLocalReps(item.reps?.toString() || "");
      setLocalRepsMin(item.repsMin?.toString() || "");
      setLocalRepsMax(item.repsMax?.toString() || "");
    }
  }, [started, item.id]); // Solo cuando started o item.id cambian

  // Funciones de cambio simplificadas
  const handleWeightChange = (text: string) => {
    setLocalWeight(text);
    const weight = text === "" ? undefined : Number(text);
    onUpdate(item.id, "weight", isNaN(Number(text)) ? undefined : weight);
  };

  const handleRepsChange = (text: string) => {
    setLocalReps(text);
    const reps = text === "" ? undefined : Number(text);
    onUpdate(item.id, "reps", isNaN(Number(text)) ? undefined : reps);
  };

  const handleRepsMinChange = (text: string) => {
    setLocalRepsMin(text);
    const repsMin = text === "" ? undefined : Number(text);
    onUpdate(item.id, "repsMin", isNaN(Number(text)) ? undefined : repsMin);
  };

  const handleRepsMaxChange = (text: string) => {
    setLocalRepsMax(text);
    const repsMax = text === "" ? undefined : Number(text);
    onUpdate(item.id, "repsMax", isNaN(Number(text)) ? undefined : repsMax);
  };

  const completedStyle = item.completed
    ? { backgroundColor: "#b3f5c2ff" }
    : { backgroundColor: "#f9f9f9" };

  return (
    <View style={[styles.row, completedStyle]}>
      <Text style={[styles.label, { flex: 1 }]}>{item.order}</Text>

      {/* Marca anterior */}
      {started && (
        <Text style={[styles.previousMark, { flex: 2 }]}>
          {previousMark || "-"}
        </Text>
      )}

      {/* Peso */}
      <TextInput
        style={[styles.input, { flex: 2 }]}
        keyboardType="numeric"
        value={localWeight}
        placeholder={
          started ? previousMark?.split("kg")[0]?.trim() || "Kg" : "Kg"
        }
        placeholderTextColor="#999"
        onChangeText={handleWeightChange}
        editable={!readonly}
      />

      {/* Repeticiones */}
      {started ? (
        <TextInput
          style={[styles.input, { flex: 2 }]}
          keyboardType="numeric"
          value={localReps}
          placeholder={
            repsType === "range"
              ? `${item.repsMin || ""}-${item.repsMax || ""}`
              : previousMark?.split("x")[1]?.trim() || "Reps"
          }
          placeholderTextColor="#999"
          onChangeText={handleRepsChange}
          editable={!readonly}
        />
      ) : repsType === "range" ? (
        <View style={[styles.rangeContainer, { flex: 2 }]}>
          <TextInput
            style={[styles.rangeInput, { flex: 1 }]}
            keyboardType="numeric"
            value={localRepsMin}
            placeholder="8"
            placeholderTextColor="#999"
            onChangeText={handleRepsMinChange}
            editable={!readonly}
          />
          <Text style={styles.rangeSeparator}>-</Text>
          <TextInput
            style={[styles.rangeInput, { flex: 1 }]}
            keyboardType="numeric"
            value={localRepsMax}
            placeholder="10"
            placeholderTextColor="#999"
            onChangeText={handleRepsMaxChange}
            editable={!readonly}
          />
        </View>
      ) : (
        <TextInput
          style={[styles.input, { flex: 2 }]}
          keyboardType="numeric"
          value={localReps}
          placeholder="Reps"
          placeholderTextColor="#999"
          onChangeText={handleRepsChange}
          editable={!readonly}
        />
      )}

      {/* Check */}
      {!readonly && (
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
      )}
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
  previousMark: {
    textAlign: "center",
    fontSize: 14,
    color: "#777",
  },
});

export default ExerciseSetRow;
