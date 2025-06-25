import { ExerciseDto } from "./exerciseService";

export interface RoutineDto {
  id: string;
  title: string;
  totalTime?: number;
  totalWeight?: number;
  completedSets?: string;
  createdAt: Date;
  updatedAt?: Date;
  exercises: ExerciseDto[];
}
