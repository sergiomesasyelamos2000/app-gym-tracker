import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { ExerciseRequestDto, RoutineRequestDto } from "../../../models";
import ExerciseListScreen from "../components/ExerciseList";
import WorkoutScreen from "../screens/WorkoutScreen";
import CreateExerciseScreen from "./CreateExerciseScreen";
import ExerciseDetailScreen from "./ExerciseDetailScreen";
import RoutineDetailScreen from "./RoutineDetailScreen";
import RoutineEditScreen from "./RoutineEditScreen";
import { useTheme } from "../../../contexts/ThemeContext";

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
    singleSelection?: boolean;
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
  ExerciseDetail: {
    exercise: ExerciseRequestDto;
  };
};

const Stack = createNativeStackNavigator<WorkoutStackParamList>();

export default function WorkoutStack() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerBackButtonDisplayMode: "minimal",
        headerStyle: {
          backgroundColor: theme.card,
        },
        headerTintColor: theme.primary,
        headerTitleStyle: {
          color: theme.text,
        },
      }}
    >
      <Stack.Screen
        name="WorkoutList"
        component={WorkoutScreen}
        options={{ title: "Entrenamiento" }}
      />
      <Stack.Screen
        name="RoutineDetail"
        component={RoutineDetailScreen}
        options={{
          title: "Detalle",
        }}
      />
      <Stack.Screen
        name="ExerciseList"
        component={ExerciseListScreen}
        options={{ title: "Listado" }}
      />
      <Stack.Screen
        name="RoutineEdit"
        component={RoutineEditScreen}
        options={{ title: "Editar rutina" }}
      />
      <Stack.Screen
        name="CreateExercise"
        component={CreateExerciseScreen}
        options={{ title: "Crear ejercicio" }}
      />
      <Stack.Screen
        name="ExerciseDetail"
        component={ExerciseDetailScreen}
        options={{ title: "Detalle del ejercicio" }}
      />
    </Stack.Navigator>
  );
}
