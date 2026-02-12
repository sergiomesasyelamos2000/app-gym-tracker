import {
  CreateExerciseDto,
  EquipmentDto,
  ExerciseRequestDto,
  ExerciseTypeDto,
  MuscleDto,
  SetRequestDto,
} from "@entity-data-models/index";

export {
  CreateExerciseDto,
  EquipmentDto,
  ExerciseRequestDto,
  ExerciseTypeDto,
  MuscleDto,
  SetRequestDto,
};

export interface ExerciseNote {
  id: string;
  text: string;
  createdAt: string;
}
