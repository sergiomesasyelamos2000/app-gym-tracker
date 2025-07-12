import { ExerciseRequestDto } from "./exercise.model";

export interface RoutineRequestDto {
  id: string;
  title: string;
  totalTime?: number;
  totalWeight?: number;
  completedSets?: number;
  createdAt: Date;
  updatedAt?: Date;
  exercises: ExerciseRequestDto[];
}

export interface RoutineResponseDto {
  id: string;
  title: string;
  totalTime: number;
  totalWeight: number;
  completedSets: number;
  createdAt: Date;
  updatedAt: Date;
}
