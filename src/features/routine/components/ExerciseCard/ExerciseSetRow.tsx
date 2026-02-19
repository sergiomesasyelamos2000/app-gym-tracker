import * as Haptics from "expo-haptics";
import { TrendingUp, Trophy, Zap } from "lucide-react-native";
import React, { memo, useCallback, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import Icon from "react-native-vector-icons/MaterialIcons";
import type { SetRequestDto } from "@sergiomesasyelamos2000/shared";
import { useTheme } from "../../../../contexts/ThemeContext";
import { getCompletedRowStyle } from "../../../../utils/themeStyles";
import { COLUMN_FLEX } from "./columnConstants";
import { useSetRowLogic } from "./useSetRowLogic";

interface Props {
  item: SetRequestDto;
  onUpdate: (
    id: string,
    field: keyof SetRequestDto,
    value: number | boolean
  ) => void;
  repsType: "reps" | "range";
  readonly?: boolean;
  previousMark?: string;
  started?: boolean;
  recordType?: "1RM" | "maxWeight" | "maxVolume";
}

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

  // Usar el custom hook para la lógica
  const {
    localWeight,
    localReps,
    localRepsMin,
    localRepsMax,
    handleWeightChange,
    handleRepsChange,
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
      item.completed ? (isDark ? "#1E293B" : "#F1F5F9") : "transparent", // Default background
      "#FFD70040", // Gold with opacity for flash
    ],
  });

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
        <Text
          style={[
            styles.label,
            {
              color: theme.text,
              fontSize: RFValue(isSmallScreen ? 13 : 15),
            },
          ]}
          accessibilityLabel={`Serie ${item.order}`}
        >
          {item.order}
        </Text>
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
              {previousMark || "-"}
            </Text>
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
          style={[
            styles.input,
            {
              backgroundColor: theme.inputBackground,
              color: theme.text,
              borderWidth: isDark ? 1 : 0,
              borderColor: theme.border,
              padding: isSmallScreen ? 8 : 12,
              fontSize: RFValue(isSmallScreen ? 13 : 15),
              minHeight: isSmallScreen ? 40 : 44,
            },
          ]}
          keyboardType="decimal-pad"
          value={localWeight}
          placeholder={
            started ? previousMark?.split("kg")[0]?.trim() || "0" : "0"
          }
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
            style={[
              styles.input,
              {
                backgroundColor: theme.inputBackground,
                color: theme.text,
                borderWidth: isDark ? 1 : 0,
                borderColor: theme.border,
                padding: isSmallScreen ? 8 : 12,
                fontSize: RFValue(isSmallScreen ? 13 : 15),
                minHeight: isSmallScreen ? 40 : 44,
              },
            ]}
            keyboardType="numeric"
            value={localReps}
            placeholder={previousMark?.split("x")[1]?.trim() || "0"}
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
                paddingHorizontal: isSmallScreen ? 2 : 4,
                minHeight: isSmallScreen ? 40 : 44,
              },
            ]}
          >
            <TextInput
              style={[
                styles.rangeInput,
                {
                  flex: 1,
                  color: theme.text,
                  paddingVertical: isSmallScreen ? 6 : 10,
                  paddingHorizontal: 2,
                  fontSize: RFValue(isSmallScreen ? 13 : 15),
                },
              ]}
              keyboardType="numeric"
              value={localRepsMin}
              placeholder="0"
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
              style={[
                styles.rangeInput,
                {
                  flex: 1,
                  color: theme.text,
                  paddingVertical: isSmallScreen ? 6 : 10,
                  paddingHorizontal: 2,
                  fontSize: RFValue(isSmallScreen ? 13 : 15),
                },
              ]}
              keyboardType="numeric"
              value={localRepsMax}
              placeholder="0"
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
            style={[
              styles.input,
              {
                backgroundColor: theme.inputBackground,
                color: theme.text,
                borderWidth: isDark ? 1 : 0,
                borderColor: theme.border,
                padding: isSmallScreen ? 8 : 12,
                fontSize: RFValue(isSmallScreen ? 13 : 15),
                minHeight: isSmallScreen ? 40 : 44,
              },
            ]}
            keyboardType="numeric"
            value={localReps}
            placeholder="0"
            placeholderTextColor={theme.textTertiary}
            onChangeText={handleRepsChange}
            editable={!readonly}
            accessibilityLabel="Repeticiones"
            accessibilityHint="Introduce el número de repeticiones"
          />
        </View>
      )}
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
              color={item.completed ? theme.success : theme.textTertiary}
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
    </Animated.View>
  );
};

// Comparador personalizado para React.memo
const arePropsEqual = (prevProps: Props, nextProps: Props) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.weight === nextProps.item.weight &&
    prevProps.item.reps === nextProps.item.reps &&
    prevProps.item.repsMin === nextProps.item.repsMin &&
    prevProps.item.repsMax === nextProps.item.repsMax &&
    prevProps.item.completed === nextProps.item.completed &&
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
  clickablePreviousMark: {
    fontWeight: "600",
  },
});

export default memo(ExerciseSetRow, arePropsEqual);
