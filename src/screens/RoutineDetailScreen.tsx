import React from "react";
import { ScrollView } from "react-native";
import ExerciseCard, { SetData } from "../components/ExerciseCard";
import { WorkoutStackParamList } from "./WorkoutStack";
import { RouteProp, useRoute } from "@react-navigation/native";

type RoutineDetailRouteProp = RouteProp<WorkoutStackParamList, "RoutineDetail">;

export default function RoutineDetailScreen() {
  const route = useRoute<RoutineDetailRouteProp>();
  const { routine } = route.params;

  const initialSets: SetData[] = [
    { id: "1", label: "1", kg: 80, reps: 10, completed: true },
    { id: "2", label: "2", kg: 85, reps: 8, completed: true },
    { id: "3", label: "3", kg: 90, reps: 6, completed: false },
    { id: "4", label: "4", kg: 90, reps: 6, completed: false },
  ];

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <ExerciseCard title={routine.name} initialSets={initialSets} />
    </ScrollView>
  );
}
