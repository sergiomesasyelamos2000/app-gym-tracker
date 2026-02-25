export interface SetRequestDto {
  id: string;
  order: number;
  weight?: number;
  reps?: number;
  assistedReps?: number;
  setType?: "warmup" | "normal" | "failed" | "drop";
  repsMin?: number;
  repsMax?: number;
  completed?: boolean;
  previousWeight?: number;
  previousReps?: number;
  previousAssistedReps?: number;
}
