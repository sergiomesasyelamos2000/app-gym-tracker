import React, { useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { TimerPickerModal } from "react-native-timer-picker";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTheme } from "../../../../contexts/ThemeContext";
import { formatTime, parseRestTime } from "./helpers";

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
  const { width, height } = useWindowDimensions();

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

  // Estilos del modal adaptados al tamaño de pantalla
  const modalFontSizes = {
    title: isSmallScreen ? 16 : isMediumScreen ? 18 : 20,
    label: isSmallScreen ? 11 : isMediumScreen ? 12 : 14,
    button: isSmallScreen ? 13 : isMediumScreen ? 14 : 16,
    pickerItem: isSmallScreen ? 20 : isMediumScreen ? 24 : 28,
  };

  const modalPadding = isSmallScreen ? 16 : isMediumScreen ? 20 : 24;
  const modalWidth = isLargeScreen ? width * 0.5 : width * 0.85;

  const handleTimeConfirm = (pickedDuration: {
    hours: number;
    minutes: number;
    seconds: number;
    days: number;
  }) => {
    const newTime = formatTime(pickedDuration);
    setRestTime(newTime);
    setShowPicker(false);
  };

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
        onPress={() => !readonly && setShowPicker(true)}
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

      <TimerPickerModal
        visible={showPicker}
        setIsVisible={setShowPicker}
        hideHours
        minuteLabel="min"
        initialValue={parseRestTime(restTime)}
        secondLabel="seg"
        onConfirm={handleTimeConfirm}
        modalTitle="Tiempo de descanso"
        onCancel={() => setShowPicker(false)}
        closeOnOverlayPress
        use12HourPicker={false}
        cancelButtonText="Cancelar"
        confirmButtonText="Confirmar"
        styles={{
          theme: "light",
          backgroundColor: theme.card,
          modalTitle: {
            fontSize: modalFontSizes.title,
            fontWeight: "700",
            color: theme.text,
            marginBottom: isSmallScreen ? 16 : 20,
            marginTop: isSmallScreen ? 8 : 12,
            textAlign: "center",
            letterSpacing: 0.3,
          },
          pickerLabel: {
            fontSize: modalFontSizes.label,
            marginTop: 4,
            color: theme.textSecondary,
            fontWeight: "600",
            textTransform: "lowercase",
          },
          pickerItem: {
            fontSize: modalFontSizes.pickerItem,
            fontWeight: "600",
            color: theme.text,
          },
          cancelButton: {
            fontSize: modalFontSizes.button,
            paddingVertical: isSmallScreen ? 10 : 12,
            paddingHorizontal: isSmallScreen ? 16 : 20,
            backgroundColor: theme.backgroundSecondary,
            color: theme.textSecondary,
            fontWeight: "600",
            borderRadius: 10,
            borderWidth: 0,
            borderColor: "transparent",
            overflow: "hidden",
          },
          confirmButton: {
            fontSize: modalFontSizes.button,
            paddingVertical: isSmallScreen ? 10 : 12,
            paddingHorizontal: isSmallScreen ? 16 : 20,
            backgroundColor: theme.primary,
            color: "#FFFFFF",
            fontWeight: "700",
            borderRadius: 10,
            borderWidth: 0,
            borderColor: "transparent",
            overflow: "hidden",
          },
          buttonContainer: {
            marginTop: isSmallScreen ? 20 : 25,
            marginBottom: isSmallScreen ? 8 : 12,
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 12,
            paddingHorizontal: modalPadding,
          },
          pickerContainer: {
            marginVertical: isSmallScreen ? 12 : 16,
            paddingHorizontal: modalPadding,
          },
          contentContainer: {
            padding: modalPadding,
            backgroundColor: theme.card,
            borderRadius: 16,
            maxWidth: modalWidth,
            width: "100%",
            ...Platform.select({
              ios: {
                shadowColor: theme.shadowColor,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
              },
              android: {
                elevation: 8,
              },
            }),
          },
        }}
      />
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
});

export default ExerciseRestPicker;
