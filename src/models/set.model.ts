export interface SetRequestDto {
  id: string;
  order: number;
  weight?: number;
  reps?: number;
  repsMin?: number;
  repsMax?: number;
  completed?: boolean;
  previousWeight?: number;
  previousReps?: number;
}
