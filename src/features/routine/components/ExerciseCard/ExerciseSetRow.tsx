import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import Icon from "react-native-vector-icons/MaterialIcons";
import { SetRequestDto } from "../../../../models";

interface Props {
  item: SetRequestDto;
  onUpdate: (
    id: string,
    field: keyof SetRequestDto,
    value: number | boolean
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
  // Estados locales
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

  // Función para extraer valores del previousMark
  const extractValuesFromPreviousMark = () => {
    if (!previousMark || previousMark === "-") return null;

    try {
      // Formato esperado: "10 kg x 8" o "22 lbs x 12"
      const parts = previousMark.split(" x ");
      if (parts.length !== 2) return null;

      const weightPart = parts[0]; // "10 kg" o "22 lbs"
      const repsPart = parts[1]; // "8"

      // Extraer el número del peso (eliminar la unidad)
      const weightValue = weightPart.split(" ")[0];
      const repsValue = repsPart;

      return {
        weight: weightValue,
        reps: repsValue,
      };
    } catch (error) {
      console.error("Error parsing previous mark:", error);
      return null;
    }
  };

  // Función para autocompletar con valores anteriores
  const handleAutofillFromPrevious = () => {
    const values = extractValuesFromPreviousMark();
    if (!values) return;

    // Autocompletar peso
    setLocalWeight(values.weight);
    onUpdate(item.id, "weight", Number(values.weight));

    // Autocompletar repeticiones según el tipo
    if (repsType === "reps") {
      setLocalReps(values.reps);
      onUpdate(item.id, "reps", Number(values.reps));
    } else {
      // Para rango, poner el mismo valor en min y max
      setLocalRepsMin(values.reps);
      setLocalRepsMax(values.reps);
      onUpdate(item.id, "repsMin", Number(values.reps));
      onUpdate(item.id, "repsMax", Number(values.reps));
    }
  };

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
  }, [started, item.id]);

  // Función helper para sanitizar valores
  const sanitizeValue = (
    value: string,
    field: keyof SetRequestDto
  ): number | boolean => {
    if (field === "completed") {
      return value === "true";
    }
    const numValue = Number(value);
    return isNaN(numValue) ? 0 : numValue;
  };

  // Handlers actualizados
  const handleWeightChange = (text: string) => {
    setLocalWeight(text);
    const value = sanitizeValue(text, "weight");
    onUpdate(item.id, "weight", value);
  };

  const handleRepsChange = (text: string) => {
    setLocalReps(text);
    const value = sanitizeValue(text, "reps");
    onUpdate(item.id, "reps", value);
  };

  const handleRepsMinChange = (text: string) => {
    setLocalRepsMin(text);
    const value = sanitizeValue(text, "repsMin");
    onUpdate(item.id, "repsMin", value);
  };

  const handleRepsMaxChange = (text: string) => {
    setLocalRepsMax(text);
    const value = sanitizeValue(text, "repsMax");
    onUpdate(item.id, "repsMax", value);
  };

  const completedStyle = item.completed
    ? { backgroundColor: "#b3f5c2ff" }
    : { backgroundColor: "#f9f9f9" };

  return (
    <View style={[styles.row, completedStyle]}>
      <Text style={[styles.label, { flex: 1 }]}>{item.order}</Text>

      {/* Marca anterior - Ahora es clickable */}
      {started && (
        <TouchableOpacity
          style={{ flex: 2 }}
          onPress={handleAutofillFromPrevious}
          disabled={readonly || !previousMark || previousMark === "-"}
        >
          <Text
            style={[
              styles.previousMark,
              previousMark &&
                previousMark !== "-" &&
                styles.clickablePreviousMark,
            ]}
          >
            {previousMark || "-"}
          </Text>
        </TouchableOpacity>
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
    fontSize: RFValue(15),
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
    fontSize: RFValue(15),
    color: "#333",
  },
  rangeSeparator: {
    marginHorizontal: 4,
    fontSize: RFValue(16),
    color: "#555",
  },
  label: {
    textAlign: "center",
    fontWeight: "500",
    color: "#444",
    fontSize: RFValue(15),
  },
  previousMark: {
    textAlign: "center",
    fontSize: RFValue(14),
    color: "#777",
  },
  clickablePreviousMark: {
    fontWeight: "600",
  },
});

export default ExerciseSetRow;
