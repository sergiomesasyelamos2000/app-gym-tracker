import { ExerciseRequestDto } from "../models";
import { apiFetch } from "./api";

export async function fetchExercises(): Promise<ExerciseRequestDto[]> {
  return apiFetch("exercises");
}
