import { apiFetch } from "../api/index";
import { ExerciseRequestDto } from "../models/index.js";

export async function fetchExercises(): Promise<ExerciseRequestDto[]> {
  return apiFetch("exercises");
}
