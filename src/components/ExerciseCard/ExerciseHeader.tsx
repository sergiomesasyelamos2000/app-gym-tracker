import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { ExerciseRequestDto } from "../../models";

interface Props {
  exercise: ExerciseRequestDto;
}

const ExerciseHeader = ({ exercise }: Props) => (
  <View style={styles.header}>
    <Image
      source={
        exercise.imageUrl
          ? { uri: `data:image/png;base64,${exercise.imageUrl}` }
          : require("../../../assets/not-image.png")
      }
      style={styles.exerciseImage}
    />
    <Text style={styles.title} numberOfLines={3} ellipsizeMode="tail">
      {exercise.name}
    </Text>
    <TouchableOpacity>
      <Icon name="more-vert" size={24} color="#000" />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    color: "#1A1A1A",
    flexShrink: 1,
  },
  exerciseImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
});

export default ExerciseHeader;
