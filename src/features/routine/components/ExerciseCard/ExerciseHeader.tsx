import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
  ScrollView,
} from "react-native";
import Modal from "react-native-modal";
import { RFValue } from "react-native-responsive-fontsize";
import Icon from "react-native-vector-icons/MaterialIcons";
import { Portal } from "react-native-paper";
import { ExerciseRequestDto } from "../../../../models";

interface Props {
  exercise: ExerciseRequestDto;
  readonly?: boolean;
  onReorder?: () => void;
  onReplace?: () => void;
  onDelete?: () => void;
  onAddSuperset?: (targetExerciseId: string) => void;
  availableExercises?: ExerciseRequestDto[];
}

const ExerciseHeader = ({
  exercise,
  readonly = false,
  onReorder,
  onReplace,
  onDelete,
  onAddSuperset,
  availableExercises = [],
}: Props) => {
  const navigation = useNavigation<any>();
  const [isActionModalVisible, setActionModalVisible] = useState(false);
  const [isSupersetModalVisible, setSupersetModalVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const handleImagePress = () => {
    navigation.navigate("ExerciseDetail", { exercise });
  };

  const openExerciseOptions = () => {
    console.log("🔥 Opening exercise options");
    setActionModalVisible(true);
  };

  const closeExerciseOptions = () => {
    console.log("🔥 Closing exercise options");
    setActionModalVisible(false);
  };

  const handleExerciseAction = (
    action: "reorder" | "replace" | "superset" | "delete"
  ) => {
    console.log("🔥 Action selected:", action);
    setPendingAction(action);
    setActionModalVisible(false);
  };

  const handleActionModalHide = () => {
    console.log("🔥 Modal cerrado, pending action:", pendingAction);

    if (!pendingAction) return;

    const action = pendingAction;
    setPendingAction(null);

    console.log("🔥 Executing action:", action);

    switch (action) {
      case "reorder":
        onReorder?.();
        break;
      case "replace":
        onReplace?.();
        break;
      case "superset":
        console.log(
          "🔥 Opening superset modal, exercises:",
          availableExercises.length
        );
        setSupersetModalVisible(true);
        break;
      case "delete":
        onDelete?.();
        break;
    }
  };

  const handleSelectSupersetExercise = (targetExercise: ExerciseRequestDto) => {
    console.log("🔥 Superset selected:", targetExercise.name);
    onAddSuperset?.(targetExercise.id);
    setSupersetModalVisible(false);
  };

  const filteredExercises = availableExercises.filter(
    (ex) => ex.id !== exercise.id
  );

  return (
    <>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleImagePress} activeOpacity={0.8}>
          <Image
            source={
              exercise.imageUrl
                ? { uri: `data:image/png;base64,${exercise.imageUrl}` }
                : require("./../../../../../assets/not-image.png")
            }
            style={styles.exerciseImage}
          />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={3} ellipsizeMode="tail">
            {exercise.name}
          </Text>
        </View>

        {!readonly && (
          <TouchableOpacity onPress={openExerciseOptions}>
            <Icon name="more-vert" size={24} color="#000" />
          </TouchableOpacity>
        )}
      </View>

      <Portal>
        {/* Modal de opciones del ejercicio */}
        <Modal
          isVisible={isActionModalVisible}
          onBackdropPress={closeExerciseOptions}
          onSwipeComplete={closeExerciseOptions}
          swipeDirection="down"
          style={styles.modalContainer}
          animationIn="slideInUp"
          animationOut="slideOutDown"
          onModalHide={handleActionModalHide}
          backdropOpacity={0.5}
          useNativeDriver
          hideModalContentWhileAnimating
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Opciones de ejercicio</Text>

            <TouchableOpacity
              style={styles.modalItem}
              onPress={() => handleExerciseAction("reorder")}
            >
              <Icon name="swap-vert" size={22} color="#4E2A84" />
              <Text style={styles.modalItemText}>Reordenar ejercicios</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalItem}
              onPress={() => handleExerciseAction("replace")}
            >
              <Icon name="sync" size={22} color="#4E2A84" />
              <Text style={styles.modalItemText}>Reemplazar ejercicio</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalItem}
              onPress={() => handleExerciseAction("superset")}
            >
              <Icon name="link" size={22} color="#4E2A84" />
              <Text style={styles.modalItemText}>Agregar a superserie</Text>
            </TouchableOpacity>

            <View style={styles.modalDivider} />

            <TouchableOpacity
              style={styles.modalItem}
              onPress={() => handleExerciseAction("delete")}
            >
              <Icon name="delete" size={22} color="#EF4444" />
              <Text style={[styles.modalItemText, styles.deleteText]}>
                Eliminar ejercicio
              </Text>
            </TouchableOpacity>
          </View>
        </Modal>

        {/* Modal de superseries */}
        <Modal
          isVisible={isSupersetModalVisible}
          onBackdropPress={() => {
            console.log("🔥 Backdrop pressed - closing superset modal");
            setSupersetModalVisible(false);
          }}
          onSwipeComplete={() => setSupersetModalVisible(false)}
          swipeDirection="down"
          style={styles.modalContainer}
          animationIn="slideInUp"
          animationOut="slideOutDown"
          backdropOpacity={0.5}
          useNativeDriver
          hideModalContentWhileAnimating
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              Superserie de {exercise.name} con...
            </Text>
            <Text style={styles.modalSubtitle}>
              Selecciona el ejercicio con el que deseas hacer superserie
            </Text>

            {filteredExercises.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="fitness-center" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>
                  No hay otros ejercicios en esta rutina
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.supersetList}>
                {filteredExercises.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.supersetItem}
                    onPress={() => handleSelectSupersetExercise(item)}
                  >
                    <Image
                      source={
                        item.imageUrl
                          ? { uri: `data:image/png;base64,${item.imageUrl}` }
                          : require("./../../../../../assets/not-image.png")
                      }
                      style={styles.supersetImage}
                    />
                    <Text style={styles.supersetName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Icon name="chevron-right" size={24} color="#9CA3AF" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </Modal>
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
    paddingVertical: 8,
  },
  title: {
    fontSize: RFValue(22),
    fontWeight: "600",
    color: "#1A1A1A",
    flexShrink: 1,
    maxWidth: 180,
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#D1D5DB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: RFValue(20),
    fontWeight: "700",
    marginBottom: 8,
    color: "#1A1A1A",
  },
  modalSubtitle: {
    fontSize: RFValue(14),
    color: "#6B7280",
    marginBottom: 16,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  modalItemText: {
    fontSize: RFValue(16),
    marginLeft: 12,
    color: "#374151",
    fontWeight: "500",
  },
  deleteText: {
    color: "#EF4444",
  },
  modalDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 8,
  },
  supersetList: {
    maxHeight: 400,
  },
  supersetItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  supersetImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: "#E5E7EB",
  },
  supersetName: {
    flex: 1,
    fontSize: RFValue(15),
    fontWeight: "600",
    color: "#374151",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: RFValue(14),
    color: "#9CA3AF",
    marginTop: 12,
    textAlign: "center",
  },
});

export default ExerciseHeader;
