import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ChevronRight } from "lucide-react-native";
import { WorkoutStackParamList } from "./WorkoutStack";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

type WorkoutScreenNavigationProp = NativeStackNavigationProp<
  WorkoutStackParamList,
  "WorkoutList"
>;

const routines = [
  {
    id: 1,
    name: "Chest and Triceps",
    description: "Bench Press, Chest Fly, Triceps Pushdown...",
  },
  {
    id: 2,
    name: "Back and Biceps",
    description: "Bent Over Row, Lat Pulldown, Cable Row...",
  },
  {
    id: 3,
    name: "Legs and Shoulders",
    description: "Squats, Leg Press, Shoulder Press...",
  },
];

export default function WorkoutScreen() {
  const navigation = useNavigation<WorkoutScreenNavigationProp>();

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Workout Routines</Text>
        <Text style={styles.headerSubtitle}>
          Choose a routine to start your workout
        </Text>
      </View>

      {/* Routine List */}
      {routines.map((routine) => (
        <TouchableOpacity
          key={routine.id}
          style={styles.routineCard}
          onPress={() => navigation.navigate("RoutineDetail", { routine })}
        >
          <View style={styles.routineInfo}>
            <Text style={styles.routineName}>{routine.name}</Text>
            <Text style={styles.routineDescription}>{routine.description}</Text>
          </View>
          <ChevronRight color="#3B82F6" size={24} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  header: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: "#3B82F6",
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#e0f2fe",
    marginTop: 4,
  },
  routineCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#e0f2fe",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },
  routineInfo: {
    flex: 1,
  },
  routineName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2563eb",
  },
  routineDescription: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
  },
});
