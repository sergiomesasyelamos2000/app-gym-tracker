import React, { useState } from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTheme } from "../../../../contexts/ThemeContext";
import { formatTime, parseTime } from "./helpers";

interface Props {
  restTime: string;
  setRestTime: (time: string) => void;
  readonly?: boolean;
}

const ExerciseRestPicker = ({
  restTime,
  setRestTime,
  readonly = false,
}: Props) => {
  const { theme } = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  const [tempMinutes, setTempMinutes] = useState(0);
  const [tempSeconds, setTempSeconds] = useState(0);
  const [activeUnit, setActiveUnit] = useState<"minutes" | "seconds">(
    "minutes"
  );
  const { width } = useWindowDimensions();

  // Determinar si es una pantalla pequeña
  const isSmallScreen = width < 375;
  const isMediumScreen = width >= 375 && width < 768;
  const isLargeScreen = width >= 768;

  // Escalado más inteligente basado en breakpoints
  const dynamicStyles = {
    containerPadding: isSmallScreen ? 10 : isMediumScreen ? 12 : 16,
    iconSize: isSmallScreen ? 18 : isMediumScreen ? 20 : 24,
    fontSize: isSmallScreen ? 13 : isMediumScreen ? 14 : 16,
    borderRadius: isSmallScreen ? 10 : 12,
    marginBottom: isSmallScreen ? 12 : isMediumScreen ? 16 : 20,
  };

  const modalPadding = isSmallScreen ? 16 : isMediumScreen ? 20 : 24;
  const modalWidth = isLargeScreen ? width * 0.5 : width * 0.85;

  const openPicker = () => {
    const { minutes, seconds } = parseTime(restTime);
    setTempMinutes(Math.max(0, Math.min(59, minutes)));
    setTempSeconds(Math.max(0, Math.min(59, seconds)));
    setActiveUnit("minutes");
    setShowPicker(true);
  };

  const handleTimeConfirm = () => {
    const newTime = formatTime({
      minutes: tempMinutes,
      seconds: tempSeconds,
    });
    setRestTime(newTime);
    setShowPicker(false);
  };

  const minuteValues = Array.from({ length: 60 }, (_, i) => i);
  const secondValues = Array.from({ length: 60 }, (_, i) => i);

  return (
    <>
      <TouchableOpacity
        style={[
          styles.timerContainer,
          {
            backgroundColor: theme.backgroundSecondary,
            borderColor: theme.border,
            padding: dynamicStyles.containerPadding,
            borderRadius: dynamicStyles.borderRadius,
            marginBottom: dynamicStyles.marginBottom,
            opacity: readonly ? 0.6 : 1,
          },
        ]}
        onPress={() => !readonly && openPicker()}
        activeOpacity={0.7}
        disabled={readonly}
      >
        <View style={[styles.iconWrapper, { backgroundColor: theme.border }]}>
          <Icon
            name="timer"
            size={dynamicStyles.iconSize}
            color={readonly ? theme.textTertiary : theme.textSecondary}
          />
        </View>

        <View style={styles.textWrapper}>
          <Text
            style={[
              styles.timerLabel,
              {
                color: theme.textSecondary,
                fontSize: dynamicStyles.fontSize * 0.85,
              },
            ]}
          >
            Descanso
          </Text>
          <Text
            style={[
              styles.timerValue,
              {
                fontSize: dynamicStyles.fontSize,
                color: readonly ? theme.textTertiary : theme.text,
              },
            ]}
          >
            {restTime}
          </Text>
        </View>

        {!readonly && (
          <Icon
            name="chevron-right"
            size={dynamicStyles.iconSize}
            color={theme.textTertiary}
            style={styles.chevronIcon}
          />
        )}
      </TouchableOpacity>

      <Modal
        visible={showPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.card,
                width: modalWidth,
                padding: modalPadding,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Tiempo de descanso
            </Text>

            <View style={styles.unitsHeader}>
              <TouchableOpacity
                onPress={() => setActiveUnit("minutes")}
                style={[
                  styles.unitChip,
                  {
                    backgroundColor:
                      activeUnit === "minutes"
                        ? theme.primary + "20"
                        : theme.backgroundSecondary,
                    borderColor:
                      activeUnit === "minutes" ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.unitChipText,
                    {
                      color:
                        activeUnit === "minutes" ? theme.primary : theme.text,
                    },
                  ]}
                >
                  Min
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveUnit("seconds")}
                style={[
                  styles.unitChip,
                  {
                    backgroundColor:
                      activeUnit === "seconds"
                        ? theme.primary + "20"
                        : theme.backgroundSecondary,
                    borderColor:
                      activeUnit === "seconds" ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.unitChipText,
                    {
                      color:
                        activeUnit === "seconds" ? theme.primary : theme.text,
                    },
                  ]}
                >
                  Seg
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pickersRow}>
              <View
                style={[
                  styles.singlePickerContainer,
                  {
                    borderColor:
                      activeUnit === "minutes" ? theme.primary : theme.border,
                    backgroundColor: theme.backgroundSecondary,
                  },
                ]}
              >
                <Picker
                  selectedValue={tempMinutes}
                  onValueChange={(value) => {
                    setActiveUnit("minutes");
                    setTempMinutes(Number(value));
                  }}
                  style={styles.picker}
                  itemStyle={{ color: theme.text }}
                >
                  {minuteValues.map((value) => (
                    <Picker.Item
                      key={`m-${value}`}
                      label={`${value.toString().padStart(2, "0")} min`}
                      value={value}
                    />
                  ))}
                </Picker>
              </View>

              <View
                style={[
                  styles.singlePickerContainer,
                  {
                    borderColor:
                      activeUnit === "seconds" ? theme.primary : theme.border,
                    backgroundColor: theme.backgroundSecondary,
                  },
                ]}
              >
                <Picker
                  selectedValue={tempSeconds}
                  onValueChange={(value) => {
                    setActiveUnit("seconds");
                    setTempSeconds(Number(value));
                  }}
                  style={styles.picker}
                  itemStyle={{ color: theme.text }}
                >
                  {secondValues.map((value) => (
                    <Picker.Item
                      key={`s-${value}`}
                      label={`${value.toString().padStart(2, "0")} seg`}
                      value={value}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => setShowPicker(false)}
              >
                <Text
                  style={[styles.modalButtonText, { color: theme.textSecondary }]}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: theme.primary, borderColor: theme.primary },
                ]}
                onPress={handleTimeConfirm}
              >
                <Text style={[styles.modalButtonText, { color: "#FFFFFF" }]}>
                  Confirmar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    justifyContent: "space-between",
    ...Platform.select({
      android: {
        elevation: 1,
      },
    }),
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  textWrapper: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
    gap: 2,
  },
  timerLabel: {
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  timerValue: {
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  chevronIcon: {
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 14,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 14,
  },
  unitsHeader: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  unitChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
  },
  unitChipText: {
    fontSize: 14,
    fontWeight: "700",
  },
  pickersRow: {
    flexDirection: "row",
    gap: 10,
  },
  singlePickerContainer: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    overflow: "hidden",
  },
  picker: {
    width: "100%",
    height: 180,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
});

export default ExerciseRestPicker;
