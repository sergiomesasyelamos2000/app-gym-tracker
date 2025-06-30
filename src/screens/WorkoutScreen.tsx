import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChevronRight } from "lucide-react-native";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { ExerciseRequestDto } from "../models/index.js";
import { WorkoutStackParamList } from "./WorkoutStack";

type WorkoutScreenNavigationProp = NativeStackNavigationProp<
  WorkoutStackParamList,
  "WorkoutList"
>;

const routines: any[] = [
  {
    id: "1",
    title: "Chest and Triceps",
    createdAt: new Date(),
    exercises: [],
  },
  {
    id: "2",
    title: "Back and Biceps",
    createdAt: new Date(),
    exercises: [],
  },
  {
    id: "3",
    title: "Legs and Shoulders",
    createdAt: new Date(),
    exercises: [],
  },
];

export default function WorkoutScreen() {
  const navigation = useNavigation<WorkoutScreenNavigationProp>();
  const { width } = useWindowDimensions();

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[styles.container, { width }]}>
        <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              navigation.navigate("ExerciseList", {
                onFinishSelection: (
                  selectedExercises: ExerciseRequestDto[]
                ) => {
                  /* const newRoutine: RoutineDto = {
                    id: Date.now().toString(),
                    title: "New Routine",
                    createdAt: new Date(),
                    exercises: selectedExercises,
                  };
                  navigation.navigate("RoutineDetail", { routine: newRoutine }); */
                },
              });
            }}
          >
            <Text style={styles.addButtonText}>+ Crear nueva rutina</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Workout Routines</Text>
          <Text style={styles.headerSubtitle}>
            Choose a routine to start your workout
          </Text>
        </View>

        {routines.map((routine) => (
          <TouchableOpacity
            key={routine.id}
            style={styles.routineCard}
            onPress={() => navigation.navigate("RoutineDetail", { routine })}
          >
            <View style={styles.routineInfo}>
              <Text style={styles.routineName}>{routine.title}</Text>
              {/* <Text style={styles.routineDescription}>
                {routine.description}
              </Text> */}
            </View>
            <ChevronRight color="#6C3BAA" size={24} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: "#f9fafb",
    alignItems: "center",
  },
  header: {
    width: "100%",
    marginBottom: 16,
    padding: 20,
    backgroundColor: "#6C3BAA",
    borderRadius: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#E0D7F5",
    marginTop: 6,
  },
  routineCard: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ede7f6",
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  routineInfo: {
    flex: 1,
    marginRight: 8,
  },
  routineName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#4E2A84",
  },
  routineDescription: {
    fontSize: 14,
    color: "#555",
    marginTop: 4,
  },
  addButton: {
    backgroundColor: "#6C3BAA",
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    alignItems: "center",
  },
  addButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
