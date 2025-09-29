import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { ExerciseRequestDto } from "../../../models";

interface Props {
  item: ExerciseRequestDto;
  isSelected: boolean;
  onSelect: (exercise: ExerciseRequestDto) => void;
  onRedirect?: (exercise: ExerciseRequestDto) => void;
}

export default function ExerciseItem({
  item,
  isSelected,
  onSelect,
  onRedirect,
}: Props) {
  console.log("item", item);

  return (
    <TouchableOpacity
      style={[styles.exerciseItem, isSelected && styles.selectedItem]}
      onPress={() => onSelect(item)}
    >
      <Image
        source={
          item.imageUrl
            ? { uri: `data:image/png;base64,${item.imageUrl}` }
            : require("./../../../../assets/not-image.png")
        }
        style={styles.exerciseImage}
      />
      <View style={styles.exerciseInfo}>
        <Text style={styles.exerciseTitle}>{item.name}</Text>
        <Text style={styles.exerciseMuscleGroup}>
          Grupo muscular: {item.bodyParts.join(", ")}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.redirectButton}
        onPress={() => onRedirect?.(item)}
      >
        <Icon name="arrow-forward" size={24} color="#6C3BAA" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  exerciseItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
  },
  selectedItem: {
    backgroundColor: "#f3e8ff",
    borderColor: "#6C3BAA",
    borderWidth: 2,
  },
  exerciseImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  exerciseMuscleGroup: {
    fontSize: 14,
    color: "#777",
    marginTop: 4,
  },
  redirectButton: {
    padding: 8,
  },
});
