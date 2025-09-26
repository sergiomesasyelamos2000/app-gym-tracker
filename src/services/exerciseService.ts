import { apiFetch } from "../api/index";
import { ExerciseRequestDto } from "../models/index.js";

/* export async function fetchExercises(): Promise<ExerciseRequestDto[]> {
  return apiFetch("exercises");
}
 */

export const fetchExercises = async (): Promise<any[]> => {
  return apiFetch("exercises");
};

export const searchExercises = async (query: string): Promise<any[]> => {
  return apiFetch(`exercises/search?name=${encodeURIComponent(query)}`);
};
