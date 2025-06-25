import { apiFetch } from "./api";

export interface ExerciseDto {
  photoUrl?: string;
  id: string;
  title: string;
  notes?: string;
  restSeconds?: string;
  muscularGroup?: string;
}

export async function fetchExercises(): Promise<ExerciseDto[]> {
  return apiFetch("exercises");
}
