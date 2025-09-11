import React, { useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  GestureHandlerRootView,
  Swipeable,
} from "react-native-gesture-handler";
import Icon from "react-native-vector-icons/MaterialIcons";
import { SetRequestDto } from "../../../../models";
import ExerciseSetRow from "./ExerciseSetRow";

interface Props {
  sets: SetRequestDto[];
  onUpdate: (
    id: string,
    field: keyof SetRequestDto,
    value: number | boolean
  ) => void;
  onDelete: (id: string) => void;
  weightUnit: "kg" | "lbs";
  repsType: "reps" | "range";
  onWeightUnitChange: (unit: "kg" | "lbs") => void;
  onRepsTypeChange: (type: "reps" | "range") => void;
}

const ExerciseSetList = ({
  sets,
  onUpdate,
  onDelete,
  weightUnit,
  repsType,
  onWeightUnitChange,
  onRepsTypeChange,
}: Props) => {
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showRepsModal, setShowRepsModal] = useState(false);

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const modalTranslateY = useRef(new Animated.Value(300)).current;

  const renderRightActions = (itemId: string) => (
    <View style={styles.actionsContainer}>
      <Icon
        name="delete"
        size={24}
        color="#F44336"
        onPress={() => onDelete(itemId)}
      />
    </View>
  );

  const openModal = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(modalTranslateY, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeModal = (callback: () => void) => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 250,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(modalTranslateY, {
        toValue: 300,
        duration: 250,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback();
    });
  };

  const WeightModal = () => (
    <Modal
      visible={showWeightModal}
      transparent={true}
      animationType="none"
      onRequestClose={() => closeModal(() => setShowWeightModal(false))}
      onShow={openModal}
    >
      <TouchableWithoutFeedback
        onPress={() => closeModal(() => setShowWeightModal(false))}
      >
        <Animated.View
          style={[styles.modalOverlay, { opacity: overlayOpacity }]}
        >
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalContent,
                { transform: [{ translateY: modalTranslateY }] },
              ]}
            >
              <Text style={styles.modalTitle}>Unidad de Peso</Text>

              <TouchableOpacity
                style={styles.optionButton}
                onPress={() => {
                  closeModal(() => {
                    onWeightUnitChange("kg");
                    setShowWeightModal(false);
                  });
                }}
              >
                <Text style={styles.optionText}>Kilogramos (kg)</Text>
                {weightUnit === "kg" && (
                  <Icon name="check" size={20} color="#6C63FF" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionButton}
                onPress={() => {
                  closeModal(() => {
                    onWeightUnitChange("lbs");
                    setShowWeightModal(false);
                  });
                }}
              >
                <Text style={styles.optionText}>Libras (lbs)</Text>
                {weightUnit === "lbs" && (
                  <Icon name="check" size={20} color="#6C63FF" />
                )}
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  const RepsModal = () => (
    <Modal
      visible={showRepsModal}
      transparent={true}
      animationType="none"
      onRequestClose={() => closeModal(() => setShowRepsModal(false))}
      onShow={openModal}
    >
      <TouchableWithoutFeedback
        onPress={() => closeModal(() => setShowRepsModal(false))}
      >
        <Animated.View
          style={[styles.modalOverlay, { opacity: overlayOpacity }]}
        >
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalContent,
                { transform: [{ translateY: modalTranslateY }] },
              ]}
            >
              <Text style={styles.modalTitle}>Tipo de Repeticiones</Text>

              <TouchableOpacity
                style={styles.optionButton}
                onPress={() => {
                  closeModal(() => {
                    onRepsTypeChange("reps");
                    setShowRepsModal(false);
                  });
                }}
              >
                <Text style={styles.optionText}>Repeticiones</Text>
                {repsType === "reps" && (
                  <Icon name="check" size={20} color="#6C63FF" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionButton}
                onPress={() => {
                  closeModal(() => {
                    onRepsTypeChange("range");
                    setShowRepsModal(false);
                  });
                }}
              >
                <Text style={styles.optionText}>Rango de Repeticiones</Text>
                {repsType === "range" && (
                  <Icon name="check" size={20} color="#6C63FF" />
                )}
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  return (
    <>
      <View style={styles.columnTitles}>
        <Text style={[styles.columnTitle, { flex: 1 }]}>Serie</Text>

        <TouchableOpacity
          style={{ flex: 2 }}
          onPress={() => setShowWeightModal(true)}
        >
          <View style={styles.columnHeader}>
            <Text style={styles.columnTitle}>{weightUnit}</Text>
            <Icon name="arrow-drop-down" size={16} color="#777" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ flex: 2 }}
          onPress={() => setShowRepsModal(true)}
        >
          <View style={styles.columnHeader}>
            <Text style={styles.columnTitle}>
              {repsType === "reps" ? "Repeticiones" : "Rango"}
            </Text>
            <Icon name="arrow-drop-down" size={16} color="#777" />
          </View>
        </TouchableOpacity>

        <Text style={[styles.columnTitle, { flex: 1 }]}>✔</Text>
      </View>

      <GestureHandlerRootView>
        <FlatList
          data={sets}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Swipeable renderRightActions={() => renderRightActions(item.id)}>
              <ExerciseSetRow item={item} onUpdate={onUpdate} />
            </Swipeable>
          )}
        />
      </GestureHandlerRootView>

      <WeightModal />
      <RepsModal />
    </>
  );
};

const styles = StyleSheet.create({
  columnTitles: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  columnHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  columnTitle: {
    fontWeight: "600",
    fontSize: 14,
    color: "#777",
    textAlign: "center",
  },
  actionsContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: 75,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#333",
  },
  optionButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  optionText: {
    fontSize: 16,
    color: "#333",
  },
});

export default ExerciseSetList;
