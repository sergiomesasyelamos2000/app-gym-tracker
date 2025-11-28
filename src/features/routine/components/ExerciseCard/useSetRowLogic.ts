import { useCallback, useEffect, useState } from "react";
import { SetRequestDto } from "../../../../models";

interface UseSetRowLogicProps {
  item: SetRequestDto;
  onUpdate: (
    id: string,
    field: keyof SetRequestDto,
    value: number | boolean
  ) => void;
  repsType: "reps" | "range";
  started: boolean;
  previousMark?: string;
}

export const useSetRowLogic = ({
  item,
  onUpdate,
  repsType,
  started,
  previousMark,
}: UseSetRowLogicProps) => {
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
  const extractValuesFromPreviousMark = useCallback(() => {
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
  }, [previousMark]);

  // Función para autocompletar con valores anteriores
  const handleAutofillFromPrevious = useCallback(() => {
    const values = extractValuesFromPreviousMark();
    if (!values) return;

    // Autocompletar peso
    setLocalWeight(values.weight);
    onUpdate(item.id, "weight", Number(values.weight));

    // En modo started, siempre usar un solo valor de reps (no rango)
    setLocalReps(values.reps);
    onUpdate(item.id, "reps", Number(values.reps));
  }, [extractValuesFromPreviousMark, item.id, onUpdate]);

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
  }, [started, item.id, item.weight, item.reps, item.repsMin, item.repsMax]);

  // Función helper para sanitizar valores
  const sanitizeValue = useCallback(
    (value: string, field: keyof SetRequestDto): number | boolean => {
      if (field === "completed") {
        return value === "true";
      }
      const numValue = Number(value);
      return isNaN(numValue) ? 0 : numValue;
    },
    []
  );

  // Handlers memoizados
  const handleWeightChange = useCallback(
    (text: string) => {
      setLocalWeight(text);
      const value = sanitizeValue(text, "weight");
      onUpdate(item.id, "weight", value);
    },
    [item.id, onUpdate, sanitizeValue]
  );

  const handleRepsChange = useCallback(
    (text: string) => {
      setLocalReps(text);
      const value = sanitizeValue(text, "reps");
      onUpdate(item.id, "reps", value);
    },
    [item.id, onUpdate, sanitizeValue]
  );

  const handleRepsMinChange = useCallback(
    (text: string) => {
      setLocalRepsMin(text);
      const value = sanitizeValue(text, "repsMin");
      onUpdate(item.id, "repsMin", value);
    },
    [item.id, onUpdate, sanitizeValue]
  );

  const handleRepsMaxChange = useCallback(
    (text: string) => {
      setLocalRepsMax(text);
      const value = sanitizeValue(text, "repsMax");
      onUpdate(item.id, "repsMax", value);
    },
    [item.id, onUpdate, sanitizeValue]
  );

  const handleToggleCompleted = useCallback(() => {
    onUpdate(item.id, "completed", !item.completed);
  }, [item.id, item.completed, onUpdate]);

  return {
    localWeight,
    localReps,
    localRepsMin,
    localRepsMax,
    handleWeightChange,
    handleRepsChange,
    handleRepsMinChange,
    handleRepsMaxChange,
    handleToggleCompleted,
    handleAutofillFromPrevious,
  };
};
