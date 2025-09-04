import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { TimerPickerModal } from "react-native-timer-picker";
import { formatTime } from "./helpers";

interface Props {
  restTime: string;
  setRestTime: (time: string) => void;
}

const ExerciseRestTimer = ({ restTime, setRestTime }: Props) => {
  const [showPicker, setShowPicker] = useState(false);
  const { width } = useWindowDimensions();

  // Escalado de fuentes y paddings según ancho
  const dynamicStyles = {
    padding: Math.max(10, width * 0.03),
    fontSize: Math.max(14, width * 0.04),
    iconSize: Math.max(20, width * 0.06),
  };

  // Tamaños responsivos para el modal
  const modalFontSizes = {
    title: Math.max(18, width * 0.045),
    label: Math.max(12, width * 0.035),
    button: Math.max(14, width * 0.038),
    pickerItem: Math.max(22, width * 0.055),
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.timerContainer, { padding: dynamicStyles.padding }]}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.8}
      >
        <Icon name="timer" size={dynamicStyles.iconSize} color="#000" />
        <Text style={[styles.timerText, { fontSize: dynamicStyles.fontSize }]}>
          Descanso: {restTime}
        </Text>
      </TouchableOpacity>

      <TimerPickerModal
        visible={showPicker}
        setIsVisible={setShowPicker}
        hideHours
        minuteLabel="min"
        secondLabel="sec"
        onConfirm={(pickedDuration) => {
          setRestTime(formatTime(pickedDuration));
          setShowPicker(false);
        }}
        modalTitle="Seleccionar tiempo de descanso"
        onCancel={() => setShowPicker(false)}
        closeOnOverlayPress
        use12HourPicker={false}
        cancelButtonText="Cancelar"
        confirmButtonText="Confirmar"
        styles={{
          theme: "light",
          // Estilos para el título
          modalTitle: {
            fontSize: modalFontSizes.title,
            fontWeight: "bold",
            marginBottom: 20,
            marginTop: 10,
            textAlign: "center",
          },
          // Estilos para las etiquetas "min" y "sec"
          pickerLabel: {
            fontSize: modalFontSizes.label,
            marginTop: 4,
          },
          // Estilos para los números del picker
          pickerItem: {
            fontSize: modalFontSizes.pickerItem,
          },
          // Estilos para los botones
          cancelButton: {
            fontSize: modalFontSizes.button,
            paddingVertical: 12,
            paddingHorizontal: 20,
          },
          confirmButton: {
            fontSize: modalFontSizes.button,
            paddingVertical: 12,
            paddingHorizontal: 20,
          },
          // Estilos para el contenedor de botones
          buttonContainer: {
            marginTop: 25,
            marginBottom: 10,
          },
          // Estilos para el contenedor del picker
          pickerContainer: {
            marginVertical: 15,
          },
          // Estilos para el contenido del modal (si está disponible)
          contentContainer: {
            padding: Math.max(20, width * 0.05),
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
    backgroundColor: "#f2f2f7",
    borderRadius: 12,
    marginBottom: 20,
    justifyContent: "flex-start",
  },
  timerText: {
    marginLeft: 10,
    color: "#333",
    fontWeight: "500",
    flexShrink: 1,
  },
});

export default ExerciseRestTimer;
