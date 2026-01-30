import { apiFetch } from "../api/client";
import {
  CreateExerciseDto,
  EquipmentDto,
  ExerciseRequestDto,
  ExerciseTypeDto,
  MuscleDto,
} from "../models/index.js";

export const fetchExercises = async (): Promise<ExerciseRequestDto[]> => {
  return apiFetch<ExerciseRequestDto[]>("exercises");
};

export const searchExercises = async (
  query: string,
): Promise<ExerciseRequestDto[]> => {
  return apiFetch<ExerciseRequestDto[]>(
    `exercises/search?name=${encodeURIComponent(query)}`,
  );
};

export const createExercise = async (
  exercise: CreateExerciseDto,
): Promise<ExerciseRequestDto> => {
  return apiFetch<ExerciseRequestDto>("exercises", {
    method: "POST",
    body: JSON.stringify(exercise),
    headers: {
      "Content-Type": "application/json",
    },
  });
};

export const fetchEquipment = async (): Promise<EquipmentDto[]> => {
  return apiFetch<EquipmentDto[]>("exercises/equipment/all");
};

export const fetchExerciseTypes = async (): Promise<ExerciseTypeDto[]> => {
  return apiFetch<ExerciseTypeDto[]>("exercises/exercise-types/all");
};

export const fetchMuscles = async (): Promise<MuscleDto[]> => {
  return apiFetch<MuscleDto[]>("exercises/muscles/all");
};
