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
import { getModalStyle, getOptionStyle } from "../../../../utils/themeStyles";
import { COLUMN_FLEX } from "./columnConstants";

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
  recordSetTypes?: { [id: string]: "1RM" | "maxWeight" | "maxVolume" };
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
  recordSetTypes = {},
}: Props) => {
  const { theme, isDark } = useTheme();
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
        style={[styles.deleteButton, { backgroundColor: theme.error }]}
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

  const modalStyles = getModalStyle(theme);

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
          style={[modalStyles.overlay, { opacity: overlayOpacity }]}
        >
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                modalStyles.content,
                { transform: [{ translateY: modalTranslateY }] },
              ]}
            >
              <View style={modalStyles.handle} />
              <Text style={modalStyles.title}>Unidad de Peso</Text>

              <TouchableOpacity
                style={getOptionStyle(theme, weightUnit === "kg").container}
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
                    color={getOptionStyle(theme, weightUnit === "kg").iconColor}
                  />
                  <Text style={getOptionStyle(theme, weightUnit === "kg").text}>
                    Kilogramos (kg)
                  </Text>
                </View>
                {weightUnit === "kg" && (
                  <View style={getOptionStyle(theme, true).checkCircle}>
                    <Icon name="check" size={16} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={getOptionStyle(theme, weightUnit === "lbs").container}
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
                    color={
                      getOptionStyle(theme, weightUnit === "lbs").iconColor
                    }
                  />
                  <Text
                    style={getOptionStyle(theme, weightUnit === "lbs").text}
                  >
                    Libras (lbs)
                  </Text>
                </View>
                {weightUnit === "lbs" && (
                  <View style={getOptionStyle(theme, true).checkCircle}>
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
          style={[modalStyles.overlay, { opacity: overlayOpacity }]}
        >
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                modalStyles.content,
                { transform: [{ translateY: modalTranslateY }] },
              ]}
            >
              <View style={modalStyles.handle} />
              <Text style={modalStyles.title}>Tipo de Repeticiones</Text>

              <TouchableOpacity
                style={getOptionStyle(theme, repsType === "reps").container}
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
                    color={getOptionStyle(theme, repsType === "reps").iconColor}
                  />
                  <Text style={getOptionStyle(theme, repsType === "reps").text}>
                    Repeticiones
                  </Text>
                </View>
                {repsType === "reps" && (
                  <View style={getOptionStyle(theme, true).checkCircle}>
                    <Icon name="check" size={16} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={getOptionStyle(theme, repsType === "range").container}
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
                    color={
                      getOptionStyle(theme, repsType === "range").iconColor
                    }
                  />
                  <Text
                    style={getOptionStyle(theme, repsType === "range").text}
                  >
                    Rango de Repeticiones
                  </Text>
                </View>
                {repsType === "range" && (
                  <View style={getOptionStyle(theme, true).checkCircle}>
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
          {
            backgroundColor: theme.background,
            paddingHorizontal: isSmallScreen ? 8 : 12,
            paddingVertical: isSmallScreen ? 6 : 8,
            borderWidth: isDark ? 1 : 0,
            borderColor: theme.border,
          },
        ]}
      >
        <View
          style={{
            flex: isSmallScreen
              ? COLUMN_FLEX.small.serie
              : COLUMN_FLEX.normal.serie,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={[
              styles.columnTitle,
              {
                color: theme.textSecondary,
                fontSize: RFValue(isSmallScreen ? 8 : 10),
              },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            SERIE
          </Text>
        </View>

        {started && (
          <View
            style={{
              flex: isSmallScreen
                ? COLUMN_FLEX.small.anterior
                : COLUMN_FLEX.normal.anterior,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={[
                styles.columnTitle,
                {
                  color: theme.textSecondary,
                  fontSize: RFValue(isSmallScreen ? 7 : 9),
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
            >
              ANTERIOR
            </Text>
          </View>
        )}

        <View
          style={{
            flex: isSmallScreen
              ? COLUMN_FLEX.small.weight
              : COLUMN_FLEX.normal.weight,
            marginHorizontal: 2,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <TouchableOpacity
            style={styles.columnHeader}
            onPress={() => !readonly && !started && setShowWeightModal(true)}
            disabled={readonly || started}
          >
            <Text
              style={[
                styles.columnTitle,
                {
                  color: theme.textSecondary,
                  fontSize: RFValue(isSmallScreen ? 8 : 10),
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {weightUnit.toUpperCase()}
            </Text>
            {!readonly && !started && (
              <Icon
                name="arrow-drop-down"
                size={isSmallScreen ? 12 : 14}
                color={theme.textTertiary}
              />
            )}
          </TouchableOpacity>
        </View>

        <View
          style={{
            flex: isSmallScreen
              ? COLUMN_FLEX.small.reps
              : COLUMN_FLEX.normal.reps,
            marginHorizontal: 2,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <TouchableOpacity
            style={styles.columnHeader}
            onPress={() => !readonly && !started && setShowRepsModal(true)}
            disabled={readonly || started}
          >
            <Text
              style={[
                styles.columnTitle,
                {
                  color: theme.textSecondary,
                  fontSize: RFValue(isSmallScreen ? 8 : 10),
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {started ? "REPS" : repsType === "reps" ? "REPS" : "RANGE"}
            </Text>
            {!readonly && !started && (
              <Icon
                name="arrow-drop-down"
                size={isSmallScreen ? 12 : 14}
                color={theme.textTertiary}
              />
            )}
          </TouchableOpacity>
        </View>

        {!readonly && (
          <View
            style={{
              flex: isSmallScreen
                ? COLUMN_FLEX.small.check
                : COLUMN_FLEX.normal.check,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon
              name="done"
              size={isSmallScreen ? 16 : 18}
              color={theme.primary}
            />
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
                recordType={recordSetTypes[item.id]} // Pass record type if exists
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
    marginBottom: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 8,
  },
  columnHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  columnTitle: {
    fontWeight: "600",
    fontSize: RFValue(10),
    textAlign: "center",
  },
  actionsContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: 75,
    marginVertical: 4,
  },
  deleteButton: {
    width: 60,
    height: "100%",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});

export default ExerciseSetList;
