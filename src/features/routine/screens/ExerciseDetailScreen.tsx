import React from "react";
import { View, Text, Image, StyleSheet, FlatList } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ExerciseRequestDto } from "../../../models";
import { WorkoutStackParamList } from "./WorkoutStack";

type Props = NativeStackScreenProps<WorkoutStackParamList, "ExerciseDetail">;

const ExerciseDetailScreen = ({ route }: Props) => {
  const { exercise } = route.params;

  const history = [
    { id: 1, date: "2025-09-20", weight: "40 kg" },
    { id: 2, date: "2025-09-25", weight: "42.5 kg" },
    { id: 3, date: "2025-10-01", weight: "45 kg" },
  ];

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: exercise.giftUrl }}
        style={styles.gif}
        resizeMode="contain"
      />
      <Text style={styles.title}>{exercise.name}</Text>
      <Text style={styles.subtitle}>Histórico de pesos</Text>

      <FlatList
        data={history}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.historyItem}>
            <Text style={styles.historyDate}>{item.date}</Text>
            <Text style={styles.historyWeight}>{item.weight}</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  gif: {
    width: "100%",
    height: 250,
    borderRadius: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
    color: "#1A1A1A",
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: "#555",
  },
  historyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  historyDate: {
    fontSize: 16,
    color: "#333",
  },
  historyWeight: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
  },
});

export default ExerciseDetailScreen;
