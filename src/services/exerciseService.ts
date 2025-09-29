import { apiFetch } from "../api/index";
import { ENV_ASSETS } from "../environments/environment";
import {
  CreateExerciseDto,
  EquipmentDto,
  ExerciseTypeDto,
  MuscleDto,
} from "../models/index.js";

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

export const createExercise = async (exercise: CreateExerciseDto) => {
  return apiFetch("exercises", {
    method: "POST",
    body: JSON.stringify(exercise),
    headers: {
      "Content-Type": "application/json",
    },
  });
};

export const fetchEquipment = async (): Promise<EquipmentDto[]> => {
  const data = await apiFetch<EquipmentDto[]>("exercises/equipment/all");

  // Construir URLs completas para las imágenes
  return data.map((equipment) => ({
    ...equipment,
    imagePath: equipment.imagePath
      ? `${ENV_ASSETS.API_URL}${equipment.imagePath}`
      : undefined,
  }));
};

export const fetchExerciseTypes = async (): Promise<ExerciseTypeDto[]> => {
  const data = await apiFetch<ExerciseTypeDto[]>(
    "exercises/exercise-types/all"
  );

  // Construir URLs completas para las imágenes
  return data.map((exerciseType) => ({
    ...exerciseType,
    imagePath: exerciseType.imagePath
      ? `${ENV_ASSETS.API_URL}${exerciseType.imagePath}`
      : undefined,
  }));
};

export const fetchMuscles = async (): Promise<MuscleDto[]> => {
  const data = await apiFetch<MuscleDto[]>("exercises/muscles/all");

  // Construir URLs completas para las imágenes
  return data.map((muscle) => ({
    ...muscle,
    imagePath: muscle.imagePath
      ? `${ENV_ASSETS.API_URL}${muscle.imagePath}`
      : undefined,
  }));
};
