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
  useWindowDimensions,
} from "react-native";
import { RFValue } from "react-native-responsive-fontsize";

import {
  GestureHandlerRootView,
  Swipeable,
} from "react-native-gesture-handler";
import Icon from "react-native-vector-icons/MaterialIcons";
import { SetRequestDto } from "../../../../models";
import ExerciseSetRow from "./ExerciseSetRow";
import { useTheme } from "../../../../contexts/ThemeContext";

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
  readonly?: boolean;
  started?: boolean;
}

const ExerciseSetList = ({
  sets,
  onUpdate,
  onDelete,
  weightUnit,
  repsType,
  onWeightUnitChange,
  onRepsTypeChange,
  readonly = false,
  started = false,
}: Props) => {
  const { theme } = useTheme();
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showRepsModal, setShowRepsModal] = useState(false);

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const modalTranslateY = useRef(new Animated.Value(300)).current;

  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;
  const isMediumScreen = width < 420;

  const renderRightActions = (itemId: string) => (
    <View style={styles.actionsContainer}>
      <TouchableOpacity
        onPress={() => onDelete(itemId)}
        style={styles.deleteButton}
      >
        <Icon name="delete" size={22} color="#fff" />
      </TouchableOpacity>
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
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Unidad de Peso</Text>

              <TouchableOpacity
                style={[
                  styles.optionButton,
                  weightUnit === "kg" && styles.optionButtonSelected,
                ]}
                onPress={() => {
                  closeModal(() => {
                    onWeightUnitChange("kg");
                    setShowWeightModal(false);
                  });
                }}
              >
                <View style={styles.optionContent}>
                  <Icon
                    name="fitness-center"
                    size={20}
                    color={weightUnit === "kg" ? "#6C3BAA" : "#999"}
                  />
                  <Text
                    style={[
                      styles.optionText,
                      weightUnit === "kg" && styles.optionTextSelected,
                    ]}
                  >
                    Kilogramos (kg)
                  </Text>
                </View>
                {weightUnit === "kg" && (
                  <View style={styles.checkCircle}>
                    <Icon name="check" size={16} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionButton,
                  weightUnit === "lbs" && styles.optionButtonSelected,
                ]}
                onPress={() => {
                  closeModal(() => {
                    onWeightUnitChange("lbs");
                    setShowWeightModal(false);
                  });
                }}
              >
                <View style={styles.optionContent}>
                  <Icon
                    name="fitness-center"
                    size={20}
                    color={weightUnit === "lbs" ? "#6C3BAA" : "#999"}
                  />
                  <Text
                    style={[
                      styles.optionText,
                      weightUnit === "lbs" && styles.optionTextSelected,
                    ]}
                  >
                    Libras (lbs)
                  </Text>
                </View>
                {weightUnit === "lbs" && (
                  <View style={styles.checkCircle}>
                    <Icon name="check" size={16} color="#fff" />
                  </View>
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
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Tipo de Repeticiones</Text>

              <TouchableOpacity
                style={[
                  styles.optionButton,
                  repsType === "reps" && styles.optionButtonSelected,
                ]}
                onPress={() => {
                  closeModal(() => {
                    onRepsTypeChange("reps");
                    setShowRepsModal(false);
                  });
                }}
              >
                <View style={styles.optionContent}>
                  <Icon
                    name="repeat"
                    size={20}
                    color={repsType === "reps" ? "#6C3BAA" : "#999"}
                  />
                  <Text
                    style={[
                      styles.optionText,
                      repsType === "reps" && styles.optionTextSelected,
                    ]}
                  >
                    Repeticiones
                  </Text>
                </View>
                {repsType === "reps" && (
                  <View style={styles.checkCircle}>
                    <Icon name="check" size={16} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionButton,
                  repsType === "range" && styles.optionButtonSelected,
                ]}
                onPress={() => {
                  closeModal(() => {
                    onRepsTypeChange("range");
                    setShowRepsModal(false);
                  });
                }}
              >
                <View style={styles.optionContent}>
                  <Icon
                    name="view-week"
                    size={20}
                    color={repsType === "range" ? "#6C3BAA" : "#999"}
                  />
                  <Text
                    style={[
                      styles.optionText,
                      repsType === "range" && styles.optionTextSelected,
                    ]}
                  >
                    Rango de Repeticiones
                  </Text>
                </View>
                {repsType === "range" && (
                  <View style={styles.checkCircle}>
                    <Icon name="check" size={16} color="#fff" />
                  </View>
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
      <View
        style={[
          styles.columnTitles,
          { backgroundColor: theme.backgroundSecondary, paddingHorizontal: isSmallScreen ? 4 : 8 },
        ]}
      >
        <Text
          style={[
            styles.columnTitle,
            {
              color: theme.textSecondary,
              flex: isSmallScreen ? 0.7 : 0.8,
              fontSize: RFValue(isSmallScreen ? 10 : 12),
            },
          ]}
        >
          #
        </Text>

        {started && (
          <Text
            style={[
              styles.columnTitle,
              {
                color: theme.textSecondary,
                flex: isSmallScreen ? 1.3 : 1.5,
                fontSize: RFValue(isSmallScreen ? 10 : 12),
              },
            ]}
            numberOfLines={1}
          >
            Ant.
          </Text>
        )}

        <TouchableOpacity
          style={{ flex: isSmallScreen ? 1.3 : 1.5 }}
          onPress={() => !readonly && !started && setShowWeightModal(true)}
          disabled={readonly}
        >
          <View style={styles.columnHeader}>
            <Text
              style={[
                styles.columnTitle,
                { color: theme.textSecondary, fontSize: RFValue(isSmallScreen ? 10 : 12) },
              ]}
            >
              {weightUnit}
            </Text>
            {!readonly && !started && (
              <Icon
                name="arrow-drop-down"
                size={isSmallScreen ? 14 : 16}
                color={theme.textTertiary}
              />
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ flex: isSmallScreen ? 1.8 : 2 }}
          onPress={() => !readonly && !started && setShowRepsModal(true)}
          disabled={readonly}
        >
          <View style={styles.columnHeader}>
            <Text
              style={[
                styles.columnTitle,
                { color: theme.textSecondary, fontSize: RFValue(isSmallScreen ? 10 : 12) },
              ]}
              numberOfLines={1}
            >
              {repsType === "reps" ? "Reps" : "Rango"}
            </Text>
            {!readonly && !started && (
              <Icon
                name="arrow-drop-down"
                size={isSmallScreen ? 14 : 16}
                color={theme.textTertiary}
              />
            )}
          </View>
        </TouchableOpacity>

        {!readonly && (
          <View
            style={[styles.checkHeader, { flex: isSmallScreen ? 0.7 : 0.8 }]}
          >
            <Icon name="done" size={isSmallScreen ? 16 : 18} color={theme.primary} />
          </View>
        )}
      </View>

      <GestureHandlerRootView>
        <FlatList
          data={sets}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Swipeable
              renderRightActions={() =>
                !readonly ? renderRightActions(item.id) : null
              }
              overshootRight={false}
            >
              <ExerciseSetRow
                item={item}
                onUpdate={onUpdate}
                repsType={repsType}
                readonly={readonly}
                previousMark={
                  started && item.previousWeight && item.previousReps
                    ? `${item.previousWeight || 0} ${weightUnit} x ${
                        item.previousReps || 0
                      }`
                    : started
                    ? "-"
                    : undefined
                }
                started={started}
              />
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
    backgroundColor: "#F8FAFC",
    paddingVertical: 8,
    borderRadius: 8,
  },
  columnHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  columnTitle: {
    fontWeight: "600",
    fontSize: RFValue(12),
    color: "#6B7280",
    textAlign: "center",
  },
  checkHeader: {
    alignItems: "center",
    justifyContent: "center",
  },
  actionsContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: 75,
    marginVertical: 4,
  },
  deleteButton: {
    backgroundColor: "#EF4444",
    width: 60,
    height: "100%",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: RFValue(18),
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 20,
    color: "#1F2937",
  },
  optionButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#F9FAFB",
    borderWidth: 2,
    borderColor: "transparent",
  },
  optionButtonSelected: {
    backgroundColor: "#F3F4FF",
    borderColor: "#6C3BAA",
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionText: {
    fontSize: RFValue(15),
    color: "#6B7280",
    fontWeight: "500",
  },
  optionTextSelected: {
    color: "#6C3BAA",
    fontWeight: "600",
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#6C3BAA",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default ExerciseSetList;
