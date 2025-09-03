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
}
