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
import { useTheme } from "../../../../contexts/ThemeContext";
import { SetRequestDto } from "../../../../models";
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
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Animación de escala
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.05,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    handleToggleCompleted();
  }, [handleToggleCompleted, scaleAnim]);

  return (
    <Animated.View
      style={[
        styles.row,
        getCompletedRowStyle(theme, item.completed ?? false),
        {
          transform: [{ scale: scaleAnim }],
          paddingHorizontal: isSmallScreen ? 8 : 12,
          paddingVertical: isSmallScreen ? 10 : 14,
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
          keyboardType="numeric"
          value={localWeight}
          placeholder={
            started ? previousMark?.split("kg")[0]?.trim() || "Kg" : "Kg"
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
            placeholder={previousMark?.split("x")[1]?.trim() || "Reps"}
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
              ? COLUMN_FLEX.small.reps
              : COLUMN_FLEX.normal.reps,
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
                  padding: isSmallScreen ? 6 : 12,
                  fontSize: RFValue(isSmallScreen ? 13 : 15),
                },
              ]}
              keyboardType="numeric"
              value={localRepsMin}
              placeholder="8"
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
                  padding: isSmallScreen ? 6 : 12,
                  fontSize: RFValue(isSmallScreen ? 13 : 15),
                },
              ]}
              keyboardType="numeric"
              value={localRepsMax}
              placeholder="10"
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
            placeholder="Reps"
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
        <View
          style={{ marginLeft: isSmallScreen ? 4 : 8 }}
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
        </View>
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
