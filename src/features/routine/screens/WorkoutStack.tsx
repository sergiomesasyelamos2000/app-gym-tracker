import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import ExerciseListScreen from "../components/ExerciseList";
import {
  CreateExerciseDto,
  ExerciseRequestDto,
  RoutineRequestDto,
} from "../../../models";
import WorkoutScreen from "../screens/WorkoutScreen";
import RoutineEditScreen from "./RoutineEditScreen";
import RoutineDetailScreen from "./RoutineDetailScreen";
import CreateExerciseScreen from "./CreateExerciseScreen";

export type WorkoutStackParamList = {
  WorkoutList: undefined;
  RoutineDetail: {
    routineId?: string;
    routine?: RoutineRequestDto;
    exercises?: ExerciseRequestDto[];
    start?: boolean;
  };
  ExerciseList: {
    onFinishSelection?: (exercises: ExerciseRequestDto[]) => void;
    routineId?: string;
  };
  RoutineEdit: {
    id: string;
    title?: string;
    exercises?: ExerciseRequestDto[];
    onUpdate?: (newTitle: string) => void;
  };
  CreateExercise: {
    onExerciseCreated?: (exercise: ExerciseRequestDto) => void;
  };
};

const Stack = createNativeStackNavigator<WorkoutStackParamList>();

export default function WorkoutStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="WorkoutList"
        component={WorkoutScreen}
        options={{ title: "Workout" }}
      />
      <Stack.Screen
        name="RoutineDetail"
        component={RoutineDetailScreen}
        options={{
          title: "Routine Detail",
          headerBackTitle: "Rutinas",
        }}
      />
      <Stack.Screen
        name="ExerciseList"
        component={ExerciseListScreen}
        options={{ title: "Exercise List" }}
      />
      <Stack.Screen
        name="RoutineEdit"
        component={RoutineEditScreen}
        options={{ title: "Routine Edit" }}
      />

      <Stack.Screen
        name="CreateExercise"
        component={CreateExerciseScreen}
        options={{ title: "Create Exercise" }}
      />
    </Stack.Navigator>
  );
}
