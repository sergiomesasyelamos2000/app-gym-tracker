import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import ExerciseListScreen from "../components/ExerciseList";
import { ExerciseRequestDto, RoutineRequestDto } from "../models";
import WorkoutScreen from "../screens/WorkoutScreen";
import RoutineDetailScreen from "./RoutineDetailScreen";
import RoutineEditScreen from "./RoutineEditScreen";

export type WorkoutStackParamList = {
  WorkoutList: undefined;
  RoutineDetail: {
    routine?: RoutineRequestDto;
    exercises?: ExerciseRequestDto[];
    start?: boolean;
  };
  ExerciseList: {
    onFinishSelection: (exercises: ExerciseRequestDto[]) => void;
  };
  RoutineEdit: {
    id: string;
    title?: string;
    exercises?: ExerciseRequestDto[];
    onUpdate?: (newTitle: string) => void;
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
        options={{ title: "Routine Detail" }}
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
    </Stack.Navigator>
  );
}
