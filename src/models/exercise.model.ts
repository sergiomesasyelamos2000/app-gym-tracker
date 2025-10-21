import { SetRequestDto } from "./set.model";

export interface ExerciseRequestDto {
  id: string;
  name: string;
  imageUrl?: string;
  giftUrl?: string;
  equipments: string[];
  bodyParts: string[];
  targetMuscles: string[];
  secondaryMuscles?: string[];
  instructions: string[];
  notes?: string;
  restSeconds?: string;
  sets?: SetRequestDto[];
  weightUnit: "kg" | "lbs";
  repsType: "reps" | "range";
  order?: number;
  supersetWith?: string;
}

export interface CreateExerciseDto {
  name: string;
  equipment: string;
  primaryMuscle: string;
  otherMuscles: string[];
  type: string;
  imageBase64?: string | null;
}

export interface EquipmentDto {
  id: string;
  name: string;
  imagePath?: string;
}

export interface MuscleDto {
  id: string;
  name: string;
  imagePath?: string;
}

export interface ExerciseTypeDto {
  id: string;
  name: string;
  imagePath?: string;
}
