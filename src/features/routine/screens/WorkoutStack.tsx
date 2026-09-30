import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import type {
  ExerciseRequestDto,
  RoutineResponseDto,
} from "@sergiomesasyelamos2000/shared";
import { useTheme } from "../../../contexts/ThemeContext";
import ExerciseListScreen from "../components/ExerciseList";
import WorkoutScreen from "../screens/WorkoutScreen";
import CreateExerciseScreen from "./CreateExerciseScreen";
import ExerciseDetailScreen from "./ExerciseDetailScreen";
import ExerciseProgressScreen from "./ExerciseProgressScreen";
import RoutineDetailScreen from "./RoutineDetailScreen";
import RoutineEditScreen from "./RoutineEditScreen";

export type WorkoutStackParamList = {
  WorkoutList: undefined;
  RoutineDetail: {
    routineId?: string;
    routine?: RoutineResponseDto;
    exercises?: ExerciseRequestDto[];
    start?: boolean;
    sessionView?: boolean;
    sessionTitle?: string;
    sessionDateLabel?: string;
    replaceExerciseId?: string;
    replacementExercise?: ExerciseRequestDto;
    addExercises?: ExerciseRequestDto[];
  };
  ExerciseList: {
    routineId?: string;
    singleSelection?: boolean;
    mode?: "createRoutine" | "replaceExercise" | "addToRoutine";
    replaceExerciseId?: string;
    draftTitle?: string;
    draftExercises?: ExerciseRequestDto[];
    returnTo?: "RoutineEdit" | "RoutineDetail";
  };
  RoutineEdit: {
    id: string;
    title?: string;
    exercises?: ExerciseRequestDto[];
    replaceExerciseId?: string;
    replacementExercise?: ExerciseRequestDto;
    addExercises?: ExerciseRequestDto[];
  };
  CreateExercise: undefined;
  ExerciseDetail: {
    exercise: ExerciseRequestDto;
  };
  ExerciseProgress: {
    exercise: ExerciseRequestDto;
  };
};

const Stack = createNativeStackNavigator<WorkoutStackParamList>();

export default function WorkoutStack() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.backgroundSecondary },
      }}
    >
      <Stack.Screen
        name="WorkoutList"
        component={WorkoutScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RoutineDetail"
        component={RoutineDetailScreen}
      />
      <Stack.Screen
        name="ExerciseList"
        component={ExerciseListScreen}
      />
      <Stack.Screen
        name="RoutineEdit"
        component={RoutineEditScreen}
      />
      <Stack.Screen
        name="CreateExercise"
        component={CreateExerciseScreen}
      />
      <Stack.Screen
        name="ExerciseDetail"
        component={ExerciseDetailScreen}
      />
      <Stack.Screen
        name="ExerciseProgress"
        component={ExerciseProgressScreen}
      />
    </Stack.Navigator>
  );
}
