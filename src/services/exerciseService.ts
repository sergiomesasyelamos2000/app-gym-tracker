import { ExerciseRequestDto } from "../models/index.js";
import { apiFetch } from "./api";

export async function fetchExercises(): Promise<ExerciseRequestDto[]> {
  return apiFetch("exercises");
}
