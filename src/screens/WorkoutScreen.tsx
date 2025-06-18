import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
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
  const { width } = useWindowDimensions();

  return (
    <ScrollView contentContainerStyle={[styles.container, { width }]}>
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
            <Text style={styles.routineName}>{routine.name}</Text>
            <Text style={styles.routineDescription}>{routine.description}</Text>
          </View>
          <ChevronRight color="#6C3BAA" size={24} />
        </TouchableOpacity>
      ))}
    </ScrollView>
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
    backgroundColor: "#6C3BAA", // royal purple :contentReference[oaicite:1]{index=1}
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
    backgroundColor: "#ede7f6", // lilac/light purple
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
    color: "#4E2A84", // deeper purple
  },
  routineDescription: {
    fontSize: 14,
    color: "#555",
    marginTop: 4,
  },
});
