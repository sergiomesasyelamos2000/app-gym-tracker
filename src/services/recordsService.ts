import { SetRequestDto } from "../models";

export interface RecordData {
  id: string;
  setId?: string; // Linked set ID (optional for backward compatibility)
  exerciseId: string;
  exerciseName: string;
  type: "1RM" | "maxWeight" | "maxVolume";
  value: number;
  previousValue: number;
  improvement: number;
  date: Date;
  setData: {
    weight: number;
    reps: number;
  };
}

/**
 * Calculate estimated 1RM using Epley formula
 * 1RM = weight × (1 + reps/30)
 */
export function calculate1RM(weight: number, reps: number): number {
  if (reps === 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/**
 * Calculate volume (weight × reps)
 */
export function calculateVolume(weight: number, reps: number): number {
  return weight * reps;
}

/**
 * Get best metrics from previous sessions
 */
export function getBestMetrics(
  exerciseId: string,
  previousSessions: any[],
): {
  best1RM: number;
  bestWeight: number;
  bestVolume: number;
} {
  let best1RM = 0;
  let bestWeight = 0;
  let bestVolume = 0;

  previousSessions.forEach((session) => {
    session.exercises?.forEach((ex: any) => {
      if (ex.exerciseId === exerciseId || ex.id === exerciseId) {
        ex.sets?.forEach((set: any) => {
          const weight = parseFloat(set.weight) || 0;
          const reps = parseInt(set.reps) || 0;

          if (set.completed) {
            // Calculate 1RM
            const estimated1RM = calculate1RM(weight, reps);
            if (estimated1RM > best1RM) {
              best1RM = estimated1RM;
            }

            // Check max weight
            if (weight > bestWeight) {
              bestWeight = weight;
            }

            // Check max volume
            const volume = calculateVolume(weight, reps);
            if (volume > bestVolume) {
              bestVolume = volume;
            }
          }
        });
      }
    });
  });

  return { best1RM, bestWeight, bestVolume };
}

/**
 * Detect if a new set is a personal record
 */
export function detectRecord(
  exerciseId: string,
  exerciseName: string,
  newSet: SetRequestDto,
  previousSessions: any[],
): RecordData | null {
  const weight = newSet.weight ?? 0;
  const reps = newSet.reps ?? 0;

  if (weight === 0 || reps === 0) {
    return null;
  }

  const { best1RM, bestWeight, bestVolume } = getBestMetrics(
    exerciseId,
    previousSessions,
  );

  const current1RM = calculate1RM(weight, reps);
  const currentVolume = calculateVolume(weight, reps);

  // Check for 1RM record (any improvement)
  if (current1RM > best1RM) {
    return {
      id: `record-${Date.now()}-${Math.random()}`,
      setId: newSet.id,
      exerciseId,
      exerciseName,
      type: "1RM",
      value: current1RM,
      previousValue: best1RM,
      improvement: current1RM - best1RM,
      date: new Date(),
      setData: { weight, reps },
    };
  }

  // Check for max weight record (any improvement)
  if (weight > bestWeight) {
    return {
      id: `record-${Date.now()}-${Math.random()}`,
      setId: newSet.id,
      exerciseId,
      exerciseName,
      type: "maxWeight",
      value: weight,
      previousValue: bestWeight,
      improvement: weight - bestWeight,
      date: new Date(),
      setData: { weight, reps },
    };
  }

  // Check for max volume record (any improvement)
  if (currentVolume > bestVolume) {
    return {
      id: `record-${Date.now()}-${Math.random()}`,
      setId: newSet.id,
      exerciseId,
      exerciseName,
      type: "maxVolume",
      value: currentVolume,
      previousValue: bestVolume,
      improvement: currentVolume - bestVolume,
      date: new Date(),
      setData: { weight, reps },
    };
  }

  return null;
}

/**
 * Format record type for display
 */
export function formatRecordType(type: RecordData["type"]): string {
  switch (type) {
    case "1RM":
      return "1RM Estimado";
    case "maxWeight":
      return "Peso Máximo";
    case "maxVolume":
      return "Volumen Máximo";
  }
}

/**
 * Format record value for display
 */
export function formatRecordValue(
  type: RecordData["type"],
  value: number,
): string {
  switch (type) {
    case "1RM":
    case "maxWeight":
      return `${value.toFixed(1)} kg`;
    case "maxVolume":
      return `${value.toFixed(0)} kg`;
  }
}
