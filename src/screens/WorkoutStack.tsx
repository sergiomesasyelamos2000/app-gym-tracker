import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import WorkoutScreen from "../screens/WorkoutScreen";
import RoutineDetailScreen from "./RoutineDetailScreen";
import ExerciseListScreen from "../components/ExerciseList";
import { ExerciseDto } from "../services/exerciseService";
import { RoutineDto } from "../services/routineService";

export type WorkoutStackParamList = {
  WorkoutList: undefined;
  RoutineDetail: { routine?: RoutineDto; exercises?: ExerciseDto[] };
  ExerciseList: { onFinishSelection: (exercises: ExerciseDto[]) => void };
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
