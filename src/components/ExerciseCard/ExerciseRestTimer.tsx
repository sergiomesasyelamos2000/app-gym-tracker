import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { TimerPickerModal } from "react-native-timer-picker";
import { formatTime } from "./helpers";

interface Props {
  restTime: string;
  setRestTime: (time: string) => void;
}

const ExerciseRestTimer = ({ restTime, setRestTime }: Props) => {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={styles.timerContainer}
        onPress={() => setShowPicker(true)}
      >
        <Icon name="timer" size={24} color="#000" />
        <Text style={styles.timerText}>Descanso: {restTime}</Text>
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
      />
    </>
  );
};

const styles = StyleSheet.create({
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2f2f7",
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  timerText: {
    marginLeft: 10,
    fontSize: 16,
    color: "#333",
  },
});

export default ExerciseRestTimer;
