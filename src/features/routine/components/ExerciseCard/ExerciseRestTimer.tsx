import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { TimerPickerModal } from "react-native-timer-picker";
import Icon from "react-native-vector-icons/MaterialIcons";
import CustomToast from "../../../../ui/CustomToast";
import { formatTime, parseRestTime } from "./helpers";

interface Props {
  restTime: string;
  setRestTime: (time: string) => void;
  readonly?: boolean;
  onTimeConfirmed?: (time: string) => void;
}

const ExerciseRestTimer = ({
  restTime,
  setRestTime,
  readonly = false,
  onTimeConfirmed,
}: Props) => {
  const [showPicker, setShowPicker] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const { width, height } = useWindowDimensions();
  const slideAnim = useRef(new Animated.Value(100)).current;
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

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

  // Limpiar el intervalo cuando el componente se desmonte
  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  // Animación para mostrar/ocultar el toast
  useEffect(() => {
    if (showToast) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [showToast]);

  const handleAddTime = () => {
    setTimeRemaining((prev) => {
      const newTime = prev + 15;
      startCountdown(newTime, false); // reinicia el intervalo con el nuevo tiempo
      return newTime;
    });
  };

  const handleSubtractTime = () => {
    setTimeRemaining((prev) => {
      const newTime = Math.max(0, prev - 15);
      startCountdown(newTime, false);
      return newTime;
    });
  };

  // Modificamos startCountdown para opcionalmente no cambiar el toastMessage
  const startCountdown = (
    timeInSeconds: number,
    updateToast: boolean = true
  ) => {
    setTotalTime(timeInSeconds);
    setTimeRemaining(timeInSeconds);

    if (countdownRef.current) clearInterval(countdownRef.current);

    countdownRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          setShowToast(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    if (updateToast && timeInSeconds > 0) {
      setToastMessage(
        `${formatTime({
          minutes: Math.floor(timeInSeconds / 60),
          seconds: timeInSeconds % 60,
        })}`
      );
      setShowToast(true);
    }
  };
  const handleTimeConfirm = (pickedDuration: any) => {
    const newTime = formatTime(pickedDuration);
    setRestTime(newTime);
    setShowPicker(false);

    const { minutes, seconds } = parseRestTime(newTime);
    const totalSeconds = minutes * 60 + seconds;

    // Mostrar toast inicial
    setToastMessage(`${newTime}`);
    setShowToast(true);
    startCountdown(totalSeconds);

    if (onTimeConfirmed) onTimeConfirmed(newTime);
  };

  const handleCancelToast = () => {
    // Detener el intervalo
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
    setShowToast(false);
  };

  // Calcular el progreso para la barra de progreso (0 a 1)
  const progress = totalTime > 0 ? timeRemaining / totalTime : 1;

  return (
    <>
      <TouchableOpacity
        style={[styles.timerContainer, { padding: dynamicStyles.padding }]}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.8}
        disabled={readonly}
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
        initialValue={parseRestTime(restTime)}
        secondLabel="sec"
        onConfirm={handleTimeConfirm}
        modalTitle="Seleccionar tiempo de descanso"
        onCancel={() => setShowPicker(false)}
        closeOnOverlayPress
        use12HourPicker={false}
        cancelButtonText="Cancelar"
        confirmButtonText="Confirmar"
        styles={{
          theme: "light",
          modalTitle: {
            fontSize: modalFontSizes.title,
            fontWeight: "bold",
            marginBottom: 20,
            marginTop: 10,
            textAlign: "center",
          },
          pickerLabel: {
            fontSize: modalFontSizes.label,
            marginTop: 4,
          },
          pickerItem: {
            fontSize: modalFontSizes.pickerItem,
          },
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
          buttonContainer: {
            marginTop: 25,
            marginBottom: 10,
          },
          pickerContainer: {
            marginVertical: 15,
          },
          contentContainer: {
            padding: Math.max(20, width * 0.05),
          },
        }}
      />

      {/* Custom Toast con animación */}
      {showToast && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              transform: [{ translateY: slideAnim }],
              bottom: 20,
            },
          ]}
        >
          <CustomToast
            text1={`${toastMessage} (${Math.floor(timeRemaining / 60)}:${(
              timeRemaining % 60
            )
              .toString()
              .padStart(2, "0")})`}
            progress={progress}
            onCancel={handleCancelToast}
            onAddTime={handleAddTime}
            onSubtractTime={handleSubtractTime}
          />
        </Animated.View>
      )}
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
  toastContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 1000,
  },
});

export default ExerciseRestTimer;
