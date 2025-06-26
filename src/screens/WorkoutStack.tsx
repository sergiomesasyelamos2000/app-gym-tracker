import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import ExerciseListScreen from "../components/ExerciseList";
import { ExerciseRequestDto, RoutineRequestDto } from "../models";
import WorkoutScreen from "../screens/WorkoutScreen";
import RoutineDetailScreen from "./RoutineDetailScreen";

export type WorkoutStackParamList = {
  WorkoutList: undefined;
  RoutineDetail: {
    routine?: RoutineRequestDto;
    exercises?: ExerciseRequestDto[];
  };
  ExerciseList: {
    onFinishSelection: (exercises: ExerciseRequestDto[]) => void;
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
    </Stack.Navigator>
  );
}
