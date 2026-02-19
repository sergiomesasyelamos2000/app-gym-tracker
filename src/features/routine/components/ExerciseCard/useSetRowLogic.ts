import { useCallback, useEffect, useState } from "react";
import type { SetRequestDto } from "@sergiomesasyelamos2000/shared";

interface UseSetRowLogicProps {
  item: SetRequestDto;
  onUpdate: (
    id: string,
    field: keyof SetRequestDto,
    value: number | boolean,
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
    started
      ? ""
      : item.weight && item.weight > 0
        ? item.weight.toString()
        : "",
  );
  const [localReps, setLocalReps] = useState<string>(
    started
      ? ""
      : item.reps && item.reps > 0
        ? item.reps.toString()
        : "",
  );
  const [localRepsMin, setLocalRepsMin] = useState<string>(
    started
      ? ""
      : item.repsMin && item.repsMin > 0
        ? item.repsMin.toString()
        : "",
  );
  const [localRepsMax, setLocalRepsMax] = useState<string>(
    started
      ? ""
      : item.repsMax && item.repsMax > 0
        ? item.repsMax.toString()
        : "",
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

  // Efecto para limpiar inputs al entrar en modo started
  useEffect(() => {
    if (started) {
      setLocalWeight("");
      setLocalReps("");
      setLocalRepsMin("");
      setLocalRepsMax("");
    }
  }, [started]);

  // Efecto para sincronizar en modo edición
  useEffect(() => {
    if (!started) {
      setLocalWeight(item.weight && item.weight > 0 ? item.weight.toString() : "");
      setLocalReps(item.reps && item.reps > 0 ? item.reps.toString() : "");
      setLocalRepsMin(
        item.repsMin && item.repsMin > 0 ? item.repsMin.toString() : ""
      );
      setLocalRepsMax(
        item.repsMax && item.repsMax > 0 ? item.repsMax.toString() : ""
      );
    }
  }, [started, item.weight, item.reps, item.repsMin, item.repsMax]);

  // Función helper para sanitizar valores
  const sanitizeValue = useCallback(
    (value: string, field: keyof SetRequestDto): number | boolean => {
      if (field === "completed") {
        return value === "true";
      }
      if (field === "weight") {
        // Allow decimal input with dot or comma (e.g. 7.5 / 7,5)
        const normalized = value.replace(",", ".").trim();
        const numValue = Number.parseFloat(normalized);
        return Number.isNaN(numValue) ? 0 : numValue;
      }

      const numValue = Number.parseInt(value, 10);
      return Number.isNaN(numValue) ? 0 : numValue;
    },
    [],
  );

  // Handlers memoizados
  const handleWeightChange = useCallback(
    (text: string) => {
      setLocalWeight(text);
      const value = sanitizeValue(text, "weight");
      onUpdate(item.id, "weight", value);
    },
    [item.id, onUpdate, sanitizeValue],
  );

  const handleRepsChange = useCallback(
    (text: string) => {
      setLocalReps(text);
      const value = sanitizeValue(text, "reps");
      onUpdate(item.id, "reps", value);
    },
    [item.id, onUpdate, sanitizeValue],
  );

  const handleRepsMinChange = useCallback(
    (text: string) => {
      setLocalRepsMin(text);
      const value = sanitizeValue(text, "repsMin");
      onUpdate(item.id, "repsMin", value);
    },
    [item.id, onUpdate, sanitizeValue],
  );

  const handleRepsMaxChange = useCallback(
    (text: string) => {
      setLocalRepsMax(text);
      const value = sanitizeValue(text, "repsMax");
      onUpdate(item.id, "repsMax", value);
    },
    [item.id, onUpdate, sanitizeValue],
  );

  const handleToggleCompleted = useCallback(() => {
    const isMarkingCompleted = !item.completed;

    if (isMarkingCompleted && started) {
      const values = extractValuesFromPreviousMark();
      if (values) {
        // Solo autocompletar si el campo está vacío
        const weightIsEmpty = !localWeight || localWeight.trim() === "";
        const repsIsEmpty = !localReps || localReps.trim() === "";

        if (weightIsEmpty) {
          setLocalWeight(values.weight);
          onUpdate(item.id, "weight", Number(values.weight));
        }

        if (repsIsEmpty) {
          setLocalReps(values.reps);
          onUpdate(item.id, "reps", Number(values.reps));
        }
      }
    }

    onUpdate(item.id, "completed", isMarkingCompleted);
  }, [
    item.id,
    item.completed,
    onUpdate,
    started,
    localWeight,
    localReps,
    extractValuesFromPreviousMark,
  ]);

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
