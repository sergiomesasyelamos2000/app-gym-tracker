import * as Haptics from "expo-haptics";
import { TrendingUp, Trophy, Zap } from "lucide-react-native";
import React, { memo, useCallback, useRef } from "react";
import {
  Animated,
  Easing,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import Icon from "react-native-vector-icons/MaterialIcons";
import type { SetRequestDto } from "@sergiomesasyelamos2000/shared";
import { useTheme } from "../../../../contexts/ThemeContext";
import { GLOBAL_KEYBOARD_ACCESSORY_ID } from "../../../../components/KeyboardDismissButton";
import { getCompletedRowStyle } from "../../../../utils/themeStyles";
import { COLUMN_FLEX } from "./columnConstants";
import { useSetRowLogic } from "./useSetRowLogic";

interface Props {
  item: SetRequestDto;
  onUpdate: (
    id: string,
    field: keyof SetRequestDto,
    value: SetRequestDto[keyof SetRequestDto]
  ) => void;
  repsType: "reps" | "range";
  readonly?: boolean;
  previousMark?: string;
  started?: boolean;
  recordType?: "1RM" | "maxWeight" | "maxVolume";
}

type SetTypeOption = {
  key: "warmup" | "normal" | "failed" | "drop";
  label: string;
  color: string;
  description: string;
  icon?: string;
};

const SET_TYPE_OPTIONS: SetTypeOption[] = [
  {
    key: "warmup",
    label: "Serie de calentamiento",
    color: "#EAB308",
    icon: "local-fire-department",
    description: "Preparación con menor carga para activar el músculo.",
  },
  {
    key: "normal",
    label: "Serie normal",
    color: "#6B7280",
    description: "Serie principal de trabajo.",
  },
  {
    key: "failed",
    label: "Serie fallida",
    color: "#DC2626",
    icon: "report",
    description: "Llegaste al fallo muscular en la serie.",
  },
  {
    key: "drop",
    label: "Serie drop",
    color: "#2563EB",
    icon: "trending-down",
    description: "Redujiste peso y continuaste sin descanso largo.",
  },
];

type SetTypeValue = SetTypeOption["key"];

const isSetTypeValue = (value: unknown): value is SetTypeValue =>
  typeof value === "string" &&
  SET_TYPE_OPTIONS.some((option) => option.key === value);

const getSetTypeValue = (value: unknown): SetTypeValue =>
  isSetTypeValue(value) ? value : "normal";

const getSetTypeLabel = (value: unknown): string =>
  SET_TYPE_OPTIONS.find((option) => option.key === getSetTypeValue(value))
    ?.label ?? "Serie normal";

const getSetTypeIcon = (value: unknown): string | null =>
  SET_TYPE_OPTIONS.find((option) => option.key === getSetTypeValue(value))
    ?.icon ?? null;

const getSetTypeColor = (value: unknown): string =>
  SET_TYPE_OPTIONS.find((option) => option.key === getSetTypeValue(value))
    ?.color ?? "#6B7280";

const ExerciseSetRow = ({
  item,
  onUpdate,
  repsType,
  readonly = false,
  previousMark,
  started = false,
  recordType,
}: Props) => {
  const { theme, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;
  const inputAccessoryProps =
    Platform.OS === "ios"
      ? { inputAccessoryViewID: GLOBAL_KEYBOARD_ACCESSORY_ID }
      : {};

  // Usar el custom hook para la lógica
  const {
    localWeight,
    localReps,
    localAssistedReps,
    localRepsMin,
    localRepsMax,
    handleWeightChange,
    handleRepsChange,
    handleAssistedRepsChange,
    handleRepsMinChange,
    handleRepsMaxChange,
    handleToggleCompleted,
    handleAutofillFromPrevious,
  } = useSetRowLogic({
    item,
    onUpdate,
    repsType,
    started,
    previousMark,
  });

  // Animación al completar set
  const handleToggleWithAnimation = useCallback(() => {
    // Lighter haptic for snappier feedback.
    void Haptics.selectionAsync();

    // Animación de escala
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.05,
        duration: 70,
        useNativeDriver: false,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 70,
        useNativeDriver: false,
      }),
    ]).start();

    handleToggleCompleted();
  }, [handleToggleCompleted, scaleAnim]);

  const iconScale = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (recordType && item.completed) {
      iconScale.setValue(0);
      Animated.spring(iconScale, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }).start();
    } else {
      iconScale.setValue(0);
    }
  }, [recordType, item.completed]);

  // Flash animation for PR
  const flashAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (recordType && item.completed) {
      // Trigger flash
      flashAnim.setValue(0);
      Animated.sequence([
        Animated.timing(flashAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false, // backgroundColor doesn't support native driver
        }),
        Animated.timing(flashAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [recordType, item.completed]);

  const backgroundColor = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      item.completed ? (isDark ? "#14532D" : "#DCFCE7") : "transparent", // Stronger green for completed rows
      "#FFD70040", // Gold with opacity for flash
    ],
  });
  const completedCheckColor = isDark ? "#4ADE80" : "#16A34A";
  const [isSetTypeModalVisible, setIsSetTypeModalVisible] =
    React.useState(false);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const modalTranslateY = useRef(new Animated.Value(280)).current;
  const setType = getSetTypeValue(
    (item as SetRequestDto & { setType?: SetTypeValue }).setType
  );
  const setTypeIcon = getSetTypeIcon(setType);
  const previousWeightPlaceholder =
    previousMark?.match(/^\s*([\d.,]+)/)?.[1]?.replace(",", ".") || "0";
  const previousRepsPlaceholder = previousMark?.match(/x\s*(\d+)/i)?.[1] || "0";
  const previousMainMark =
    previousMark?.replace(/\s*\(A:\d+\)\s*$/i, "").trim() || "-";
  const previousAssistedMark = previousMark?.match(/\(A:(\d+)\)/i)?.[1];

  const openSetTypeModal = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(modalTranslateY, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeSetTypeModal = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(modalTranslateY, {
        toValue: 280,
        duration: 220,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback?.();
    });
  };

  const handleSelectSetType = (nextType: SetTypeValue) => {
    onUpdate(
      item.id,
      "setType" as keyof SetRequestDto,
      nextType as SetRequestDto[keyof SetRequestDto]
    );
    closeSetTypeModal(() => setIsSetTypeModalVisible(false));
  };

  return (
    <Animated.View
      style={[
        styles.row,
        getCompletedRowStyle(theme, item.completed ?? false),
        {
          transform: [{ scale: scaleAnim }],
          paddingHorizontal: isSmallScreen ? 8 : 12,
          paddingVertical: isSmallScreen ? 10 : 14,
          backgroundColor: backgroundColor, // Apply animated background
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
        <TouchableOpacity
          onPress={() => !readonly && setIsSetTypeModalVisible(true)}
          disabled={readonly}
          style={styles.setTypeTrigger}
          accessibilityLabel={`Serie ${item.order}. ${getSetTypeLabel(
            setType
          )}`}
          accessibilityHint={
            readonly ? undefined : "Toca para cambiar el tipo de serie"
          }
        >
          <Text
            style={[
              styles.label,
              {
                color: theme.text,
                fontSize: RFValue(isSmallScreen ? 13 : 15),
              },
            ]}
          >
            {item.order}
          </Text>
          {setTypeIcon ? (
            <View
              style={[
                styles.setTypeBadge,
                {
                  backgroundColor: getSetTypeColor(setType),
                },
              ]}
            >
              <Icon name={setTypeIcon} size={11} color="#FFFFFF" />
            </View>
          ) : null}
        </TouchableOpacity>
      </View>
      {/* Marca anterior - Ahora es clickable */}
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
          <TouchableOpacity
            onPress={handleAutofillFromPrevious}
            disabled={readonly || !previousMark || previousMark === "-"}
            accessibilityLabel="Autocompletar con marca anterior"
            accessibilityHint="Toca para copiar los valores de tu sesión anterior"
            style={{ width: "100%" }}
          >
            <View style={styles.previousMarkContainer}>
              <Text
                style={[
                  styles.previousMark,
                  {
                    color: theme.textSecondary,
                    fontSize: RFValue(isSmallScreen ? 12 : 14),
                  },
                  previousMark &&
                    previousMark !== "-" &&
                    styles.clickablePreviousMark,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {previousMainMark}
              </Text>
              {previousAssistedMark ? (
                <Text
                  style={[
                    styles.previousAssistedMark,
                    {
                      color: theme.textTertiary,
                    },
                  ]}
                  numberOfLines={1}
                >
                  A:{previousAssistedMark}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
        </View>
      )}
      {/* Peso */}
      <View
        style={{
          flex: isSmallScreen
            ? COLUMN_FLEX.small.weight
            : COLUMN_FLEX.normal.weight,
          marginHorizontal: 2,
        }}
      >
        <TextInput
          {...inputAccessoryProps}
          style={[
            styles.input,
            {
              backgroundColor: theme.inputBackground,
              color: theme.text,
              borderWidth: isDark ? 1 : 0,
              borderColor: theme.border,
              padding: isSmallScreen ? 9 : 12,
              fontSize: RFValue(isSmallScreen ? 14 : 16),
              minHeight: isSmallScreen ? 44 : 48,
            },
          ]}
          keyboardType="decimal-pad"
          value={localWeight}
          selectTextOnFocus
          placeholder={started ? previousWeightPlaceholder : "0"}
          placeholderTextColor={theme.textTertiary}
          onChangeText={handleWeightChange}
          editable={!readonly}
          accessibilityLabel="Peso"
          accessibilityHint="Introduce el peso levantado"
        />
      </View>
      {/* Repeticiones */}
      {started ? (
        // En modo entrenamiento, SIEMPRE mostrar un solo input de reps (como Hevy)
        <View
          style={{
            flex: isSmallScreen
              ? COLUMN_FLEX.small.reps
              : COLUMN_FLEX.normal.reps,
            marginHorizontal: 2,
          }}
        >
          <TextInput
            {...inputAccessoryProps}
            style={[
              styles.input,
              {
                backgroundColor: theme.inputBackground,
              color: theme.text,
              borderWidth: isDark ? 1 : 0,
              borderColor: theme.border,
              padding: isSmallScreen ? 9 : 12,
              fontSize: RFValue(isSmallScreen ? 14 : 16),
              minHeight: isSmallScreen ? 44 : 48,
            },
          ]}
            keyboardType="numeric"
            value={localReps}
            selectTextOnFocus
            placeholder={
              repsType === "range"
                ? `${
                    item.repsMin && item.repsMin > 0
                      ? item.repsMin
                      : item.reps && item.reps > 0
                      ? item.reps
                      : 0
                  }-${
                    item.repsMax && item.repsMax > 0
                      ? item.repsMax
                      : item.reps && item.reps > 0
                      ? item.reps
                      : 0
                  }`
                : previousRepsPlaceholder
            }
            placeholderTextColor={theme.textTertiary}
            onChangeText={handleRepsChange}
            editable={!readonly}
            accessibilityLabel="Repeticiones"
            accessibilityHint="Introduce el número de repeticiones"
          />
        </View>
      ) : repsType === "range" ? (
        // En modo edición, mostrar rango si corresponde
        <View
          style={{
            flex: isSmallScreen
              ? COLUMN_FLEX.small.repsRange
              : COLUMN_FLEX.normal.repsRange,
            marginHorizontal: 2,
          }}
        >
          <View
            style={[
              styles.rangeContainer,
              {
                backgroundColor: theme.inputBackground,
                borderWidth: isDark ? 1 : 0,
                borderColor: theme.border,
                paddingHorizontal: isSmallScreen ? 3 : 4,
                minHeight: isSmallScreen ? 44 : 48,
              },
            ]}
          >
            <TextInput
              {...inputAccessoryProps}
              style={[
                styles.rangeInput,
                {
                  flex: 1,
                  color: theme.text,
                  paddingVertical: isSmallScreen ? 7 : 10,
                  paddingHorizontal: 2,
                  fontSize: RFValue(isSmallScreen ? 14 : 16),
                },
              ]}
              keyboardType="numeric"
              value={localRepsMin}
              selectTextOnFocus
              placeholder={
                started
                  ? item.repsMin && item.repsMin > 0
                    ? item.repsMin.toString()
                    : item.reps && item.reps > 0
                    ? item.reps.toString()
                    : "0"
                  : "0"
              }
              placeholderTextColor={theme.textTertiary}
              onChangeText={handleRepsMinChange}
              editable={!readonly}
              accessibilityLabel="Repeticiones mínimas"
            />
            <Text
              style={[
                styles.rangeSeparator,
                {
                  color: theme.textSecondary,
                  fontSize: RFValue(isSmallScreen ? 14 : 16),
                },
              ]}
            >
              -
            </Text>
            <TextInput
              {...inputAccessoryProps}
              style={[
                styles.rangeInput,
                {
                  flex: 1,
                  color: theme.text,
                  paddingVertical: isSmallScreen ? 7 : 10,
                  paddingHorizontal: 2,
                  fontSize: RFValue(isSmallScreen ? 14 : 16),
                },
              ]}
              keyboardType="numeric"
              value={localRepsMax}
              selectTextOnFocus
              placeholder={
                started
                  ? item.repsMax && item.repsMax > 0
                    ? item.repsMax.toString()
                    : item.reps && item.reps > 0
                    ? item.reps.toString()
                    : "0"
                  : "0"
              }
              placeholderTextColor={theme.textTertiary}
              onChangeText={handleRepsMaxChange}
              editable={!readonly}
              accessibilityLabel="Repeticiones máximas"
            />
          </View>
        </View>
      ) : (
        <View
          style={{
            flex: isSmallScreen
              ? COLUMN_FLEX.small.reps
              : COLUMN_FLEX.normal.reps,
            marginHorizontal: 2,
          }}
        >
          <TextInput
            {...inputAccessoryProps}
            style={[
              styles.input,
              {
                backgroundColor: theme.inputBackground,
              color: theme.text,
              borderWidth: isDark ? 1 : 0,
              borderColor: theme.border,
              padding: isSmallScreen ? 9 : 12,
              fontSize: RFValue(isSmallScreen ? 14 : 16),
              minHeight: isSmallScreen ? 44 : 48,
            },
          ]}
            keyboardType="numeric"
            value={localReps}
            selectTextOnFocus
            placeholder="0"
            placeholderTextColor={theme.textTertiary}
            onChangeText={handleRepsChange}
            editable={!readonly}
            accessibilityLabel="Repeticiones"
            accessibilityHint="Introduce el número de repeticiones"
          />
        </View>
      )}
      {/* Repeticiones asistidas */}
      <View
        style={{
          flex: isSmallScreen
            ? COLUMN_FLEX.small.assisted
            : COLUMN_FLEX.normal.assisted,
          marginHorizontal: 2,
        }}
      >
        <TextInput
          {...inputAccessoryProps}
          style={[
            styles.input,
            {
              backgroundColor: theme.inputBackground,
              color: theme.text,
              borderWidth: isDark ? 1 : 0,
              borderColor: theme.border,
              padding: isSmallScreen ? 9 : 12,
              fontSize: RFValue(isSmallScreen ? 14 : 16),
              minHeight: isSmallScreen ? 44 : 48,
            },
          ]}
          keyboardType="numeric"
          value={localAssistedReps}
          selectTextOnFocus
          placeholder="0"
          placeholderTextColor={theme.textTertiary}
          onChangeText={handleAssistedRepsChange}
          editable={!readonly}
          accessibilityLabel="Repeticiones asistidas"
          accessibilityHint="Introduce cuántas repeticiones fueron asistidas"
        />
      </View>
      {/* Check */}
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
          <TouchableOpacity
            onPress={handleToggleWithAnimation}
            activeOpacity={1}
            accessibilityLabel={
              item.completed ? "Serie completada" : "Serie no completada"
            }
            accessibilityHint="Toca para marcar como completada o no completada"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: item.completed }}
          >
            <Icon
              name={item.completed ? "check-circle" : "radio-button-unchecked"}
              size={isSmallScreen ? 24 : 28}
              color={item.completed ? completedCheckColor : theme.textTertiary}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Record Icon */}
      {recordType && item.completed && (
        <Animated.View
          style={{
            marginLeft: isSmallScreen ? 4 : 8,
            transform: [{ scale: iconScale }],
          }}
          accessibilityLabel="Récord personal"
        >
          {recordType === "1RM" && (
            <Trophy size={isSmallScreen ? 16 : 20} color="#FFD700" />
          )}
          {recordType === "maxWeight" && (
            <TrendingUp size={isSmallScreen ? 16 : 20} color="#FFD700" />
          )}
          {recordType === "maxVolume" && (
            <Zap size={isSmallScreen ? 16 : 20} color="#FFD700" />
          )}
        </Animated.View>
      )}

      <Modal
        visible={isSetTypeModalVisible}
        transparent
        animationType="none"
        onShow={openSetTypeModal}
        onRequestClose={() =>
          closeSetTypeModal(() => setIsSetTypeModalVisible(false))
        }
        statusBarTranslucent={Platform.OS === "android"}
      >
        <TouchableWithoutFeedback
          onPress={() =>
            closeSetTypeModal(() => setIsSetTypeModalVisible(false))
          }
        >
          <Animated.View
            style={[styles.modalOverlay, { opacity: overlayOpacity }]}
          >
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.modalCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    transform: [{ translateY: modalTranslateY }],
                  },
                ]}
              >
                <View
                  style={[
                    styles.modalHandle,
                    { backgroundColor: theme.textTertiary },
                  ]}
                />
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  Tipo de serie
                </Text>
                {SET_TYPE_OPTIONS.map((option) => {
                  const isSelected = setType === option.key;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.modalOption,
                        {
                          borderColor: theme.border,
                          backgroundColor: isSelected
                            ? `${theme.primary}14`
                            : theme.card,
                        },
                      ]}
                      onPress={() => handleSelectSetType(option.key)}
                    >
                      <View style={styles.modalOptionRow}>
                        <View
                          style={[
                            styles.modalTypePill,
                            { backgroundColor: option.color },
                          ]}
                        >
                          {option.icon ? (
                            <Icon
                              name={option.icon}
                              size={14}
                              color="#FFFFFF"
                            />
                          ) : (
                            <View style={styles.modalTypeDot} />
                          )}
                        </View>

                        <View style={styles.modalTextBlock}>
                          <View style={styles.modalTitleRow}>
                            <Text
                              style={[
                                styles.modalOptionText,
                                {
                                  color: isSelected
                                    ? theme.primary
                                    : theme.text,
                                },
                              ]}
                            >
                              {option.label}
                            </Text>
                            <Icon
                              name="info-outline"
                              size={16}
                              color={theme.textSecondary}
                              style={styles.modalInfoIcon}
                            />
                          </View>
                          <Text
                            style={[
                              styles.modalOptionDescription,
                              { color: theme.textSecondary },
                            ]}
                          >
                            {option.description}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>
    </Animated.View>
  );
};

// Comparador personalizado para React.memo
const arePropsEqual = (prevProps: Props, nextProps: Props) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.weight === nextProps.item.weight &&
    prevProps.item.reps === nextProps.item.reps &&
    prevProps.item.assistedReps === nextProps.item.assistedReps &&
    prevProps.item.repsMin === nextProps.item.repsMin &&
    prevProps.item.repsMax === nextProps.item.repsMax &&
    prevProps.item.completed === nextProps.item.completed &&
    (prevProps.item as SetRequestDto & { setType?: string }).setType ===
      (nextProps.item as SetRequestDto & { setType?: string }).setType &&
    prevProps.item.order === nextProps.item.order &&
    prevProps.repsType === nextProps.repsType &&
    prevProps.readonly === nextProps.readonly &&
    prevProps.previousMark === nextProps.previousMark &&
    prevProps.started === nextProps.started &&
    prevProps.recordType === nextProps.recordType
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    borderRadius: 16,
  },
  input: {
    borderRadius: 12,
    textAlign: "center",
  },
  rangeContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
  },
  rangeInput: {
    textAlign: "center",
  },
  rangeSeparator: {
    marginHorizontal: 4,
  },
  label: {
    textAlign: "center",
    fontWeight: "500",
  },
  previousMark: {
    textAlign: "center",
  },
  previousMarkContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  previousAssistedMark: {
    textAlign: "center",
    fontSize: 12,
    marginTop: 1,
  },
  clickablePreviousMark: {
    fontWeight: "600",
  },
  setTypeTrigger: {
    alignItems: "center",
  },
  setTypeBadge: {
    marginTop: 4,
    width: 18,
    height: 18,
    borderRadius: 8,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    width: "100%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 22,
  },
  modalHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    alignSelf: "center",
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  modalOption: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  modalOptionText: {
    fontSize: 15,
    fontWeight: "600",
  },
  modalOptionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  modalTypePill: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    marginRight: 10,
  },
  modalTypeDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },
  modalTextBlock: {
    flex: 1,
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalInfoIcon: {
    marginLeft: 8,
  },
  modalOptionDescription: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
  },
});

export default memo(ExerciseSetRow, arePropsEqual);
