import React, { useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import {
  GestureHandlerRootView,
  Swipeable,
} from "react-native-gesture-handler";
import { Button, Card } from "react-native-paper";
import { TimerPickerModal } from "react-native-timer-picker";
import Toast from "react-native-toast-message";
import uuid from "react-native-uuid";
import Icon from "react-native-vector-icons/MaterialIcons";
import { ExerciseRequestDto } from "../models/index.js";

export interface SetData {
  id: string;
  order: number;
  weight?: number;
  reps?: number;
  completed?: boolean;
}

interface Props {
  exercise: ExerciseRequestDto;
  initialSets: SetData[];
  onChangeSets?: (updatedSets: SetData[]) => void;
  onChangeExercise?: (updatedExercise: ExerciseRequestDto) => void;
}

const ExerciseCard = ({
  exercise,
  initialSets,
  onChangeSets,
  onChangeExercise,
}: Props) => {
  const [sets, setSets] = useState<SetData[]>(initialSets);
  const [note, setNote] = useState(exercise.notes || "");
  const [showPicker, setShowPicker] = useState(false);
  const [progress, setProgress] = useState(1);

  const initialRestTime = exercise.restSeconds
    ? (() => {
        const seconds = parseInt(exercise.restSeconds, 10) || 0;
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, "0")}:${secs
          .toString()
          .padStart(2, "0")}`;
      })()
    : "00:00";
  const [restTime, setRestTime] = useState(initialRestTime);

  useEffect(() => {
    if (onChangeSets) onChangeSets(sets);
  }, [sets]);

  useEffect(() => {
    if (onChangeExercise) {
      onChangeExercise({
        ...exercise,
        notes: note,
        restSeconds: (
          parseTime(restTime).minutes * 60 +
          parseTime(restTime).seconds
        ).toString(),
      });
    }
  }, [note, restTime]);

  const formatTime = ({
    minutes,
    seconds,
  }: {
    hours?: number;
    minutes?: number;
    seconds?: number;
  }) => {
    const timeParts = [];
    if (minutes !== undefined) {
      timeParts.push(minutes.toString().padStart(2, "0"));
    }
    if (seconds !== undefined) {
      timeParts.push(seconds.toString().padStart(2, "0"));
    }
    return timeParts.join(":");
  };

  const addSet = () => {
    const newId = uuid.v4() as string; // Generar un UUID válido
    const updatedSets = [
      ...sets,
      {
        id: newId,
        order: sets.length + 1,
        weight: 0,
        reps: 0,
        completed: false,
      } as SetData,
    ];
    setSets(updatedSets.map((set, index) => ({ ...set, order: index + 1 }))); // Recalcula el orden
  };

  const startCountdown = (minutes: number, seconds: number) => {
    let totalSeconds = minutes * 60 + seconds;
    const initialTotalSeconds = totalSeconds;

    const interval = setInterval(() => {
      if (totalSeconds <= 0) {
        clearInterval(interval);
        Toast.show({
          type: "customToast",
          text1: "¡Descanso terminado!",
          position: "bottom",
          props: { progress: 0 },
        });
      } else {
        const currentMinutes = Math.floor(totalSeconds / 60);
        const currentSeconds = totalSeconds % 60;
        const remainingProgress = totalSeconds / initialTotalSeconds;

        setProgress(remainingProgress);

        Toast.show({
          type: "customToast",
          text1: `${currentMinutes.toString().padStart(2, "0")}:${currentSeconds
            .toString()
            .padStart(2, "0")}`,
          position: "bottom",
          props: {
            progress: remainingProgress,
            onCancel: () => {
              clearInterval(interval);
              setProgress(0);
              Toast.hide();
            },
            onAddTime: () => {
              totalSeconds += 15;
              const updatedMinutes = Math.floor(totalSeconds / 60);
              const updatedSeconds = totalSeconds % 60;
              const updatedProgress = totalSeconds / initialTotalSeconds;

              setProgress(updatedProgress);
              Toast.show({
                type: "customToast",
                text1: `${updatedMinutes
                  .toString()
                  .padStart(2, "0")}:${updatedSeconds
                  .toString()
                  .padStart(2, "0")}`,
                position: "bottom",
                props: { progress: updatedProgress },
              });
            },
            onSubtractTime: () => {
              totalSeconds -= 15;
              if (totalSeconds < 0) totalSeconds = 0;
              const updatedMinutes = Math.floor(totalSeconds / 60);
              const updatedSeconds = totalSeconds % 60;
              const updatedProgress = totalSeconds / initialTotalSeconds;

              setProgress(updatedProgress);
              Toast.show({
                type: "customToast",
                text1: `${updatedMinutes
                  .toString()
                  .padStart(2, "0")}:${updatedSeconds
                  .toString()
                  .padStart(2, "0")}`,
                position: "bottom",
                props: { progress: updatedProgress },
              });
            },
          },
        });

        totalSeconds -= 1;
      }
    }, 1000);
  };

  const renderRightActions = (itemId: string) => (
    <View style={styles.actionsContainer}>
      <TouchableOpacity
        style={[styles.button]}
        onPress={() =>
          setSets(
            (prev) =>
              prev
                .filter((set) => set.id !== itemId) // Elimina el set
                .map((set, index) => ({ ...set, order: index + 1 })) // Recalcula el orden
          )
        }
      >
        <Icon name="delete" color="#F44336" size={24} />
      </TouchableOpacity>
    </View>
  );

  const parseTime = (timeStr: string): { minutes: number; seconds: number } => {
    const [minStr, secStr] = timeStr.split(":");
    return {
      minutes: parseInt(minStr) || 0,
      seconds: parseInt(secStr) || 0,
    };
  };

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Image
          source={
            exercise.imageUrl
              ? { uri: `data:image/png;base64,${exercise.imageUrl}` }
              : require("../../assets/not-image.png")
          }
          style={styles.exerciseImage}
        />
        {/* <Image
          source={
            exercise.giftUrl
              ? { uri: exercise.giftUrl }
              : require("../../assets/not-image.png")
          }
          style={styles.exerciseImage}
        /> */}
        <Text
          style={styles.title}
          numberOfLines={3} // Permite hasta 3 líneas
          ellipsizeMode="tail"
        >
          {exercise.name}
        </Text>
        <TouchableOpacity>
          <Icon name="more-vert" size={24} color="#000" />
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.noteInput}
        placeholder="Añadir nota..."
        value={exercise.notes}
        onChangeText={setNote}
      />
      <TouchableOpacity
        style={styles.timerContainer}
        onPress={() => setShowPicker(true)}
      >
        <Icon name="timer" size={24} color="#000" />
        <Text style={styles.timerText}>
          Temporizador de descanso: {restTime}
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
          /* startCountdown(
            pickedDuration.minutes || 0,
            pickedDuration.seconds || 0
          ); */
        }}
        modalTitle="Seleccionar tiempo de descanso"
        onCancel={() => setShowPicker(false)}
        closeOnOverlayPress
        use12HourPicker={false}
        cancelButtonText="Cancelar"
        confirmButtonText="Confirmar"
        styles={{
          theme: "light",
          pickerLabel: { right: -20 },
          modalTitle: { fontSize: 18, fontWeight: "600" },
          container: { width: "80%" },
          confirmButton: { borderColor: "#6C63FF", color: "#6C63FF" },
        }}
      />
      <View style={styles.columnTitles}>
        <Text style={[styles.columnTitle, { flex: 1 }]}>Serie</Text>
        <Text style={[styles.columnTitle, { flex: 2 }]}>Peso</Text>
        <Text style={[styles.columnTitle, { flex: 2 }]}>Reps</Text>
        <Text style={[styles.columnTitle, { flex: 1 }]}>✔</Text>
      </View>

      <GestureHandlerRootView>
        <FlatList
          data={sets}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Swipeable renderRightActions={() => renderRightActions(item.id)}>
              <View style={styles.row}>
                <Text style={[styles.label, { flex: 1 }]}>{item.order}</Text>
                <TextInput
                  style={[styles.input, { flex: 2 }]}
                  keyboardType="numeric"
                  value={item.weight?.toString()}
                  onChangeText={(text) =>
                    setSets((prev) =>
                      prev.map((set) =>
                        set.id === item.id
                          ? { ...set, weight: parseInt(text) || 0 }
                          : set
                      )
                    )
                  }
                />
                <TextInput
                  style={[styles.input, { flex: 2 }]}
                  keyboardType="numeric"
                  value={item.reps?.toString()}
                  onChangeText={(text) =>
                    setSets((prev) =>
                      prev.map((set) =>
                        set.id === item.id
                          ? { ...set, reps: parseInt(text) || 0 }
                          : set
                      )
                    )
                  }
                />
                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={() => {
                    setSets((prev) => {
                      const updated = prev.map((set) =>
                        set.id === item.id
                          ? { ...set, completed: !set.completed }
                          : set
                      );

                      const updatedItem = updated.find(
                        (set) => set.id === item.id
                      );

                      if (updatedItem?.completed === true) {
                        // si la serie va a pasar a "completada"
                        const { minutes, seconds } = parseTime(restTime);
                        if (minutes > 0 || seconds > 0) {
                          startCountdown(minutes, seconds);
                        }
                      }

                      return updated;
                    });
                  }}
                >
                  <Icon
                    name={
                      item.completed ? "check-circle" : "radio-button-unchecked"
                    }
                    size={24}
                    color={item.completed ? "#4CAF50" : "#9E9E9E"}
                  />
                </TouchableOpacity>
              </View>
            </Swipeable>
          )}
        />
      </GestureHandlerRootView>
      <Button mode="contained" onPress={addSet} style={styles.addButton}>
        + Añadir Serie
      </Button>
    </Card>
  );
};
const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    marginVertical: 16,
    padding: 20,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    color: "#1A1A1A",
    flexShrink: 1,
  },
  exerciseImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  noteInput: {
    borderWidth: 0,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    backgroundColor: "#fafafc",
    fontSize: 16,
    color: "#333",
  },
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
  columnTitles: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  columnTitle: {
    fontWeight: "600",
    fontSize: 14,
    color: "#777",
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: "#f9f9f9",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    textAlign: "center",
    fontWeight: "500",
    color: "#444",
    fontSize: 15,
  },
  input: {
    backgroundColor: "#e8e8ed",
    borderRadius: 12,
    padding: 8,
    marginHorizontal: 6,
    textAlign: "center",
    fontSize: 15,
    color: "#333",
  },
  addButton: {
    marginTop: 20,
    backgroundColor: "#6C63FF",
    borderRadius: 14,
    paddingVertical: 8,
  },
  actionsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  button: {
    width: 75,
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
  },
});

export default ExerciseCard;
