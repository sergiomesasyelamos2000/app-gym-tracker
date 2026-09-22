import * as Haptics from "expo-haptics";
import { TrendingUp, Trophy, Zap } from "lucide-react-native";
import React, { memo, useCallback, useRef, useState } from "react";
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
import Icon from "react-native-vector-icons/MaterialIcons";
import type { SetRequestDto } from "@sergiomesasyelamos2000/shared";
import { useTheme } from "../../../../contexts/ThemeContext";
import { GLOBAL_KEYBOARD_ACCESSORY_ID } from "../../../../components/KeyboardDismissButton";
import { getCompletedRowStyle } from "../../../../utils/themeStyles";
import {
  COLUMN_GAP,
  COLUMN_ROW_PADDING,
  SET_BADGE,
  SET_CHECK,
  SET_INPUT,
  getAnteriorColumnStyle,
  getColumnFlex,
  getRepsColumnFlex,
} from "./columnConstants";
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
  rowIndex?: number;
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
  rowIndex = 0,
}: Props) => {
  const { theme, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;
  const sizeKey = isSmallScreen ? "small" : "normal";
  const inputAccessoryProps =
    Platform.OS === "ios"
      ? { inputAccessoryViewID: GLOBAL_KEYBOARD_ACCESSORY_ID }
      : {};

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

  const handleToggleWithAnimation = useCallback(() => {
    void Haptics.selectionAsync();

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
  }, [recordType, item.completed, iconScale]);

  const flashAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (recordType && item.completed) {
      flashAnim.setValue(0);
      Animated.sequence([
        Animated.timing(flashAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(flashAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [recordType, item.completed, flashAnim]);

  const backgroundColor = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      item.completed
        ? isDark
          ? "#14532D99"
          : "#DCFCE7"
        : "transparent",
      "#FFD70040",
    ],
  });

  const [isSetTypeModalVisible, setIsSetTypeModalVisible] = useState(false);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const modalTranslateY = useRef(new Animated.Value(280)).current;
  const setType = getSetTypeValue(
    (item as SetRequestDto & { setType?: SetTypeValue }).setType
  );
  const setTypeIcon = getSetTypeIcon(setType);
  const setTypeColor = getSetTypeColor(setType);
  const isSpecialSetType = setType !== "normal";

  const previousWeightPlaceholder =
    previousMark?.match(/^\s*([\d.,]+)/)?.[1]?.replace(",", ".") || "0";
  const previousMainMark =
    previousMark?.replace(/\s*\(A:\d+\)\s*$/i, "").trim() || "-";
  const previousAssistedMark = previousMark?.match(/\(A:(\d+)\)/i)?.[1];
  const hasPreviousMark = Boolean(
    previousMainMark && previousMainMark !== "-"
  );

  const rangePlaceholder =
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
      : "0";

  const columnFlex = getColumnFlex(isSmallScreen, started);
  const repsColumnFlex = getRepsColumnFlex(isSmallScreen, repsType, started);
  const rowPaddingHorizontal = COLUMN_ROW_PADDING[sizeKey];
  const inputHeight = SET_INPUT.height[sizeKey];
  const inputFontSize = SET_INPUT.fontSize[sizeKey];
  const inputPaddingH = SET_INPUT.paddingH[sizeKey];
  const badgeSize = SET_BADGE.size[sizeKey];
  const checkSize = SET_CHECK.size[sizeKey];
  const showCheck = started && !readonly;
  const showAssisted = started;
  const isZebra = readonly && !started && rowIndex % 2 === 1;

  const displayWeight =
    item.weight != null && item.weight > 0 ? String(item.weight) : "-";
  const displayReps =
    repsType === "range" && !started
      ? `${item.repsMin ?? item.reps ?? 0}-${item.repsMax ?? item.reps ?? 0}`
      : item.reps != null && item.reps > 0
      ? String(item.reps)
      : "-";

  const hevyInputStyle = {
    backgroundColor: theme.card,
    color: theme.text,
    borderWidth: SET_INPUT.borderWidth,
    borderColor: theme.border,
    borderRadius: SET_INPUT.radius,
    height: inputHeight,
    paddingHorizontal: inputPaddingH,
    paddingVertical: 0,
    fontSize: inputFontSize,
    fontWeight: "700" as const,
    textAlign: "center" as const,
    width: "100%" as const,
    ...(Platform.OS === "android"
      ? { includeFontPadding: false, textAlignVertical: "center" as const }
      : {}),
  };

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
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeSetTypeModal = (onClosed?: () => void) => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(modalTranslateY, {
        toValue: 280,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onClosed?.();
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

  const renderValueCell = (value: string, flex: number) => (
    <View
      style={{
        flex,
        marginHorizontal: COLUMN_GAP / 2,
        minWidth: 0,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={[
          styles.readonlyValue,
          { color: theme.text, fontSize: inputFontSize },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {value}
      </Text>
    </View>
  );

  return (
    <>
      <Animated.View
        style={[
          styles.row,
          getCompletedRowStyle(theme, item.completed ?? false),
          {
            transform: [{ scale: scaleAnim }],
            paddingHorizontal: rowPaddingHorizontal,
            paddingVertical: isSmallScreen ? 6 : 8,
            backgroundColor: item.completed
              ? backgroundColor
              : isZebra
              ? theme.backgroundSecondary
              : "transparent",
          },
        ]}
      >
        {/* Serie badge */}
        <View
          style={{
            flex: columnFlex.serie,
            alignItems: "center",
            justifyContent: "center",
            minWidth: 0,
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
            <View
              style={[
                styles.serieBadge,
                {
                  width: badgeSize,
                  height: badgeSize,
                  borderRadius: SET_BADGE.radius,
                  backgroundColor: isSpecialSetType
                    ? setTypeColor
                    : theme.backgroundSecondary,
                },
              ]}
            >
              <Text
                style={[
                  styles.serieBadgeText,
                  {
                    color: isSpecialSetType ? theme.onPrimary : theme.text,
                    fontSize: isSmallScreen ? 13 : 14,
                  },
                ]}
              >
                {item.order}
              </Text>
            </View>
            {setTypeIcon && isSpecialSetType ? (
              <View
                style={[
                  styles.setTypeBadge,
                  { backgroundColor: setTypeColor },
                ]}
              >
                <Icon name={setTypeIcon} size={10} color={theme.onPrimary} />
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        {/* Marca anterior — solo entreno */}
        {started && (
          <View style={getAnteriorColumnStyle(isSmallScreen)}>
            {hasPreviousMark ? (
              <TouchableOpacity
                onPress={handleAutofillFromPrevious}
                disabled={readonly}
                accessibilityLabel="Autocompletar con marca anterior"
                accessibilityHint="Toca para copiar los valores de tu sesión anterior"
                style={{
                  width: "100%",
                  minHeight: inputHeight,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <View style={styles.previousMarkContainer}>
                  <Text
                    style={[
                      styles.previousMark,
                      styles.clickablePreviousMark,
                      {
                        color: theme.textSecondary,
                        fontSize: isSmallScreen ? 11 : 12,
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {previousMainMark}
                  </Text>
                  {previousAssistedMark ? (
                    <Text
                      style={[
                        styles.previousAssistedMark,
                        { color: theme.textTertiary },
                      ]}
                      numberOfLines={1}
                    >
                      A:{previousAssistedMark}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ) : (
              <Text
                style={{
                  color: theme.textTertiary,
                  fontSize: 15,
                  fontWeight: "600",
                  textAlign: "center",
                  width: "100%",
                  includeFontPadding: false,
                }}
              >
                -
              </Text>
            )}
          </View>
        )}

        {/* Readonly detail: plain text cells */}
        {readonly && !started ? (
          <>
            {renderValueCell(displayWeight, columnFlex.weight)}
            {renderValueCell(displayReps, repsColumnFlex)}
          </>
        ) : (
          <>
            {/* Peso */}
            <View
              style={{
                flex: columnFlex.weight,
                marginHorizontal: COLUMN_GAP / 2,
                minWidth: 0,
              }}
            >
              <TextInput
                {...inputAccessoryProps}
                style={[styles.input, hevyInputStyle]}
                keyboardType="decimal-pad"
                value={localWeight}
                selectTextOnFocus
                placeholder={previousWeightPlaceholder}
                placeholderTextColor={theme.textTertiary}
                onChangeText={handleWeightChange}
                editable={!readonly}
                accessibilityLabel="Peso"
                accessibilityHint="Introduce el peso levantado"
              />
            </View>

            {/* Repeticiones */}
            {started || repsType !== "range" ? (
              <View
                style={{
                  flex: repsColumnFlex,
                  marginHorizontal: COLUMN_GAP / 2,
                  minWidth: 0,
                }}
              >
                <TextInput
                  {...inputAccessoryProps}
                  style={[styles.input, hevyInputStyle]}
                  keyboardType="numeric"
                  value={localReps}
                  selectTextOnFocus
                  placeholder={started ? rangePlaceholder : "0"}
                  placeholderTextColor={theme.textTertiary}
                  onChangeText={handleRepsChange}
                  editable={!readonly}
                  accessibilityLabel="Repeticiones"
                  accessibilityHint="Introduce el número de repeticiones"
                />
              </View>
            ) : (
              <View
                style={{
                  flex: repsColumnFlex,
                  marginHorizontal: COLUMN_GAP / 2,
                  minWidth: 0,
                }}
              >
                <View
                  style={[
                    styles.rangeContainer,
                    {
                      backgroundColor: theme.card,
                      borderWidth: SET_INPUT.borderWidth,
                      borderColor: theme.border,
                      borderRadius: SET_INPUT.radius,
                      height: inputHeight,
                      paddingHorizontal: 2,
                    },
                  ]}
                >
                  <TextInput
                    {...inputAccessoryProps}
                    style={[
                      styles.rangeInput,
                      {
                        color: theme.text,
                        fontSize: inputFontSize,
                        fontWeight: "700",
                        ...(Platform.OS === "android"
                          ? {
                              includeFontPadding: false,
                              textAlignVertical: "center" as const,
                            }
                          : {}),
                      },
                    ]}
                    keyboardType="numeric"
                    value={localRepsMin}
                    selectTextOnFocus
                    placeholder={
                      item.repsMin && item.repsMin > 0
                        ? item.repsMin.toString()
                        : item.reps && item.reps > 0
                        ? item.reps.toString()
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
                        fontSize: inputFontSize,
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
                        color: theme.text,
                        fontSize: inputFontSize,
                        fontWeight: "700",
                        ...(Platform.OS === "android"
                          ? {
                              includeFontPadding: false,
                              textAlignVertical: "center" as const,
                            }
                          : {}),
                      },
                    ]}
                    keyboardType="numeric"
                    value={localRepsMax}
                    selectTextOnFocus
                    placeholder={
                      item.repsMax && item.repsMax > 0
                        ? item.repsMax.toString()
                        : item.reps && item.reps > 0
                        ? item.reps.toString()
                        : "0"
                    }
                    placeholderTextColor={theme.textTertiary}
                    onChangeText={handleRepsMaxChange}
                    editable={!readonly}
                    accessibilityLabel="Repeticiones máximas"
                  />
                </View>
              </View>
            )}
          </>
        )}

        {/* ASIS — solo entreno */}
        {showAssisted && (
          <View
            style={{
              flex: getColumnFlex(isSmallScreen, true).assisted,
              marginHorizontal: COLUMN_GAP / 2,
              minWidth: 0,
            }}
          >
            <TextInput
              {...inputAccessoryProps}
              style={[styles.input, hevyInputStyle]}
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
        )}

        {/* Check cuadrado — solo entreno editable */}
        {showCheck && (
          <View
            style={{
              flex: getColumnFlex(isSmallScreen, true).check,
              alignItems: "center",
              justifyContent: "center",
              minWidth: 0,
            }}
          >
            <TouchableOpacity
              onPress={handleToggleWithAnimation}
              activeOpacity={0.85}
              accessibilityLabel={
                item.completed ? "Serie completada" : "Serie no completada"
              }
              accessibilityHint="Toca para marcar como completada o no completada"
              accessibilityRole="checkbox"
              accessibilityState={{ checked: item.completed }}
            >
              <View>
                <View
                  style={[
                    styles.checkButton,
                    {
                      width: checkSize,
                      height: checkSize,
                      borderRadius: SET_CHECK.radius,
                      backgroundColor: item.completed
                        ? theme.success
                        : theme.backgroundSecondary,
                    },
                  ]}
                >
                  <Icon
                    name="check"
                    size={isSmallScreen ? 16 : 18}
                    color={item.completed ? "#FFFFFF" : theme.textTertiary}
                  />
                </View>
                {recordType && item.completed ? (
                  <Animated.View
                    style={[
                      styles.recordBadge,
                      { transform: [{ scale: iconScale }] },
                    ]}
                    accessibilityLabel="Récord personal"
                  >
                    {recordType === "1RM" && (
                      <Trophy size={12} color="#FFD700" />
                    )}
                    {recordType === "maxWeight" && (
                      <TrendingUp size={12} color="#FFD700" />
                    )}
                    {recordType === "maxVolume" && (
                      <Zap size={12} color="#FFD700" />
                    )}
                  </Animated.View>
                ) : null}
              </View>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      {/* Modal tipo de serie */}
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
            style={[
              styles.modalOverlay,
              { opacity: overlayOpacity, backgroundColor: theme.overlay },
            ]}
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
                            ? theme.selection
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
                              color={theme.onPrimary}
                            />
                          ) : (
                            <View
                              style={[
                                styles.modalTypeDot,
                                { backgroundColor: theme.onPrimary },
                              ]}
                            />
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
    </>
  );
};

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
    prevProps.recordType === nextProps.recordType &&
    prevProps.rowIndex === nextProps.rowIndex
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    borderRadius: 8,
  },
  input: {
    borderRadius: SET_INPUT.radius,
    textAlign: "center",
  },
  rangeContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
  },
  rangeInput: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    textAlign: "center",
    paddingVertical: 0,
    paddingHorizontal: 2,
  },
  rangeSeparator: {
    marginHorizontal: 2,
  },
  readonlyValue: {
    textAlign: "center",
    fontWeight: "700",
  },
  previousMark: {
    textAlign: "center",
    width: "100%",
  },
  previousMarkContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    minHeight: 18,
  },
  previousAssistedMark: {
    textAlign: "center",
    fontSize: 10,
    marginTop: 1,
  },
  clickablePreviousMark: {
    fontWeight: "600",
  },
  setTypeTrigger: {
    alignItems: "center",
  },
  serieBadge: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  serieBadgeText: {
    fontWeight: "700",
    textAlign: "center",
  },
  setTypeBadge: {
    marginTop: 3,
    width: 16,
    height: 16,
    borderRadius: 8,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  checkButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  recordBadge: {
    position: "absolute",
    right: -6,
    top: -4,
  },
  modalOverlay: {
    flex: 1,
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
