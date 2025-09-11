import { ExerciseRequestDto } from "./exercise.model";

export interface RoutineRequestDto {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt?: Date;
  exercises: ExerciseRequestDto[];
}

export interface RoutineResponseDto {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}
