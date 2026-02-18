import React, { memo, useCallback, useEffect, useRef, useState } from "react";
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
import * as Haptics from "expo-haptics";

import {
  GestureHandlerRootView,
  Swipeable,
} from "react-native-gesture-handler";
import Icon from "react-native-vector-icons/MaterialIcons";
import type { SetRequestDto } from "@sergiomesasyelamos2000/shared";
import { useTheme } from "../../../../contexts/ThemeContext";
import { getModalStyle, getOptionStyle } from "../../../../utils/themeStyles";
import ExerciseSetRow from "./ExerciseSetRow";
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

interface SetListItemProps {
  item: SetRequestDto;
  readonly: boolean;
  repsType: "reps" | "range";
  started: boolean;
  previousMark?: string;
  recordType?: "1RM" | "maxWeight" | "maxVolume";
  onUpdate: (
    id: string,
    field: keyof SetRequestDto,
    value: number | boolean
  ) => void;
  onSwipeableWillOpen: () => void;
  renderRightActions: (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    itemId: string
  ) => React.ReactNode;
}

const SetListItem = memo(
  ({
    item,
    readonly,
    repsType,
    started,
    previousMark,
    recordType,
    onUpdate,
    onSwipeableWillOpen,
    renderRightActions,
  }: SetListItemProps) => {
    return (
      <Swipeable
        renderRightActions={(progress, dragX) =>
          !readonly ? renderRightActions(progress, dragX, item.id) : null
        }
        overshootRight={false}
        onSwipeableWillOpen={onSwipeableWillOpen}
      >
        <ExerciseSetRow
          item={item}
          onUpdate={onUpdate}
          repsType={repsType}
          readonly={readonly}
          previousMark={previousMark}
          started={started}
          recordType={recordType}
        />
      </Swipeable>
    );
  },
  (prev, next) =>
    prev.item === next.item &&
    prev.readonly === next.readonly &&
    prev.repsType === next.repsType &&
    prev.started === next.started &&
    prev.previousMark === next.previousMark &&
    prev.recordType === next.recordType
);

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

  const onUpdateRef = useRef(onUpdate);
  const onDeleteRef = useRef(onDelete);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    onDeleteRef.current = onDelete;
  }, [onDelete]);

  const handleUpdate = useCallback(
    (id: string, field: keyof SetRequestDto, value: number | boolean) => {
      onUpdateRef.current(id, field, value);
    },
    []
  );

  const renderRightActions = useCallback((
    progress: Animated.AnimatedInterpolation<number>,
    _dragX: Animated.AnimatedInterpolation<number>,
    itemId: string
  ) => {
    const scale = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.85, 1],
      extrapolate: "clamp",
    });

    const opacity = progress.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 0.6, 1],
      extrapolate: "clamp",
    });

    return (
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          onPress={() => onDeleteRef.current(itemId)}
          activeOpacity={0.7}
          style={[
            styles.deleteButton,
            {
              backgroundColor: theme.error,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.deleteContent,
              {
                opacity,
                transform: [{ scale }],
              },
            ]}
          >
            <Icon name="delete-outline" size={24} color="#fff" />
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  }, [theme.error]);

  const handleSwipeableWillOpen = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const getPreviousMark = useCallback(
    (item: SetRequestDto): string | undefined => {
      if (!started) return undefined;

      if (
        "previousWeight" in item &&
        "previousReps" in item &&
        item.previousWeight &&
        item.previousReps
      ) {
        return `${item.previousWeight || 0} ${weightUnit} x ${
          item.previousReps || 0
        }`;
      }

      return "-";
    },
    [started, weightUnit]
  );

  const keyExtractor = useCallback(
    (item: SetRequestDto, index: number) =>
      typeof item.id === "string" && item.id.trim().length > 0
        ? item.id
        : `set-${item.order ?? index}-${index}`,
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: SetRequestDto }) => (
      <SetListItem
        item={item}
        readonly={readonly}
        repsType={repsType}
        started={started}
        previousMark={getPreviousMark(item)}
        recordType={recordSetTypes[item.id]}
        onUpdate={handleUpdate}
        onSwipeableWillOpen={handleSwipeableWillOpen}
        renderRightActions={renderRightActions}
      />
    ),
    [
      getPreviousMark,
      handleUpdate,
      handleSwipeableWillOpen,
      readonly,
      recordSetTypes,
      renderRightActions,
      repsType,
      started,
    ]
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
              ? !started && repsType === "range"
                ? COLUMN_FLEX.small.repsRange
                : COLUMN_FLEX.small.reps
              : !started && repsType === "range"
              ? COLUMN_FLEX.normal.repsRange
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
              {started ? "REPS" : repsType === "reps" ? "REPS" : "RANGO"}
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
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews={true}
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
    width: 70,
    marginVertical: 4,
  },
  deleteButton: {
    width: 64,
    height: "100%",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});

export default ExerciseSetList;
