import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Modal from "react-native-modal";
import { RFValue } from "react-native-responsive-fontsize";
import Icon from "react-native-vector-icons/MaterialIcons";
import { ExerciseRequestDto } from "../../../../models";

interface Props {
  exercise: ExerciseRequestDto;
  readonly?: boolean; // <-- añadimos la prop readonly
}

const ExerciseHeader = ({ exercise, readonly = false }: Props) => {
  const navigation = useNavigation<any>();
  const [isActionModalVisible, setActionModalVisible] = useState(false);

  const handleImagePress = () => {
    navigation.navigate("ExerciseDetail", { exercise });
  };

  const openExerciseOptions = () => setActionModalVisible(true);
  const closeExerciseOptions = () => setActionModalVisible(false);

  const handleExerciseAction = (
    action: "reorder" | "replace" | "superset" | "delete"
  ) => {
    closeExerciseOptions();
    switch (action) {
      case "reorder":
        console.log("Reordenar ejercicio");
        break;
      case "replace":
        console.log("Reemplazar ejercicio");
        break;
      case "superset":
        console.log("Agregar superserie");
        break;
      case "delete":
        console.log("Eliminar ejercicio");
        break;
    }
  };

  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={handleImagePress}>
        <Image
          source={
            exercise.imageUrl
              ? { uri: `data:image/png;base64,${exercise.imageUrl}` }
              : require("./../../../../../assets/not-image.png")
          }
          style={styles.exerciseImage}
        />
      </TouchableOpacity>

      <Text style={styles.title} numberOfLines={3} ellipsizeMode="tail">
        {exercise.name}
      </Text>

      {/* Solo mostrar el icono si no es readonly */}
      {!readonly && (
        <TouchableOpacity onPress={openExerciseOptions}>
          <Icon name="more-vert" size={24} color="#000" />
        </TouchableOpacity>
      )}

      {/* Modal de opciones */}
      <Modal
        isVisible={isActionModalVisible}
        onBackdropPress={closeExerciseOptions}
        onSwipeComplete={closeExerciseOptions}
        swipeDirection="down"
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Opciones de ejercicio</Text>

          <TouchableOpacity
            style={styles.modalItem}
            onPress={() => handleExerciseAction("reorder")}
          >
            <Icon name="swap-vert" size={20} color="#4E2A84" />
            <Text style={styles.modalItemText}>Reordenar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modalItem}
            onPress={() => handleExerciseAction("replace")}
          >
            <Icon name="sync" size={20} color="#4E2A84" />
            <Text style={styles.modalItemText}>Reemplazar ejercicio</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modalItem}
            onPress={() => handleExerciseAction("superset")}
          >
            <Icon name="add-link" size={20} color="#4E2A84" />
            <Text style={styles.modalItemText}>Agregar superserie</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modalItem}
            onPress={() => handleExerciseAction("delete")}
          >
            <Icon name="delete" size={20} color="red" />
            <Text style={[styles.modalItemText, { color: "red" }]}>
              Eliminar ejercicio
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: RFValue(22),
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
  modalContainer: {
    justifyContent: "flex-end",
    margin: 0,
  },
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalTitle: {
    fontSize: RFValue(18),
    fontWeight: "700",
    marginBottom: 12,
    color: "#1A1A1A",
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  modalItemText: {
    fontSize: RFValue(16),
    marginLeft: 12,
    color: "#333",
  },
});

export default ExerciseHeader;
