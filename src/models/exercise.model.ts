import {
  ExerciseRequestDto,
  SetRequestDto,
  ExerciseTypeEntity as ExerciseTypeDto,
  MuscleEntity as MuscleDto,
  EquipmentEntity as EquipmentDto,
  CreateExerciseDto, // Verify if this exists in shared or not. Step 146 didn't show it explicitly but it might be in exercise.model shared.
} from "@entity-data-models/index";

export {
  ExerciseRequestDto,
  SetRequestDto,
  ExerciseTypeDto,
  MuscleDto,
  EquipmentDto,
  CreateExerciseDto,
};

export interface ExerciseNote {
  id: string;
  text: string;
  createdAt: string;
}
