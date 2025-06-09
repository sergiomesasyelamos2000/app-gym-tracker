import React, { useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Button, Card } from "react-native-paper";
import { TimerPickerModal } from "react-native-timer-picker";
import Toast from "react-native-toast-message";
import Icon from "react-native-vector-icons/MaterialIcons";

export interface SetData {
  id: string;
  label: string;
  kg: number;
  reps: number;
  completed: boolean;
}

interface Props {
  title: string;
  initialSets: SetData[];
}

const ExerciseCard = ({ title, initialSets }: Props) => {
  const [sets, setSets] = useState<SetData[]>(initialSets);
  const [note, setNote] = useState("");
  const [restTime, setRestTime] = useState("00:00");
  const [showPicker, setShowPicker] = useState(false);

  const formatTime = ({
    minutes,
    seconds,
  }: {
    minutes?: number;
    seconds?: number;
  }) => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${pad(minutes ?? 0)}:${pad(seconds ?? 0)}`;
  };

  const addSet = () => {
    const newId = `${sets.length + 1}`;
    setSets([
      ...sets,
      { id: newId, label: newId, kg: 0, reps: 0, completed: false },
    ]);
  };

  const startCountdown = (minutes: number, seconds: number) => {
    let totalSeconds = minutes * 60 + seconds;
    let remaining = totalSeconds;

    const interval = setInterval(() => {
      if (remaining <= 0) {
        clearInterval(interval);
        Toast.hide();

        Toast.show({
          type: "customToast",
          text1: "¡Descanso terminado!",
        });
      } else {
        Toast.show({
          type: "customToast",
          text1: `Descansando: ${Math.floor(remaining / 60)
            .toString()
            .padStart(2, "0")}:${(remaining % 60).toString().padStart(2, "0")}`,
          props: {
            totalTime: totalSeconds,
            remainingTime: remaining,
          },
          position: "bottom",
        });
        remaining -= 1;
      }
    }, 1000);
  };

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity>
          <Icon name="more-vert" size={24} color="#000" />
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.noteInput}
        placeholder="Añadir nota..."
        value={note}
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
        onConfirm={({ minutes = 0, seconds = 0 }) => {
          setRestTime(formatTime({ minutes, seconds }));
          setShowPicker(false);
          startCountdown(minutes, seconds);
        }}
        modalTitle="Seleccionar tiempo de descanso"
        onCancel={() => setShowPicker(false)}
        closeOnOverlayPress
        use12HourPicker={false}
        styles={{
          theme: "light",
          pickerLabel: { right: -20 },
        }}
      />
      <View style={styles.columnTitles}>
        <Text style={[styles.columnTitle, { flex: 1 }]}>Serie</Text>
        <Text style={[styles.columnTitle, { flex: 2 }]}>Peso</Text>
        <Text style={[styles.columnTitle, { flex: 2 }]}>Reps</Text>
        <Text style={[styles.columnTitle, { flex: 1 }]}>✔</Text>
      </View>
      <FlatList
        data={sets}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={[styles.label, { flex: 1 }]}>{item.label}</Text>
            <TextInput
              style={[styles.input, { flex: 2 }]}
              keyboardType="numeric"
              value={item.kg.toString()}
              onChangeText={(text) =>
                setSets((prev) =>
                  prev.map((set) =>
                    set.id === item.id
                      ? { ...set, kg: parseInt(text) || 0 }
                      : set
                  )
                )
              }
            />
            <TextInput
              style={[styles.input, { flex: 2 }]}
              keyboardType="numeric"
              value={item.reps.toString()}
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
              onPress={() =>
                setSets((prev) =>
                  prev.map((set) =>
                    set.id === item.id
                      ? { ...set, completed: !set.completed }
                      : set
                  )
                )
              }
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
        )}
      />
      <Button mode="contained" onPress={addSet} style={styles.addButton}>
        + Añadir Serie
      </Button>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#f3f2ea",
    marginVertical: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
  },
  noteInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
    backgroundColor: "#FFF",
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  timerText: {
    marginLeft: 8,
    fontSize: 16,
    color: "#000",
  },
  columnTitles: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  columnTitle: {
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    backgroundColor: "#FFF",
    padding: 8,
    borderRadius: 8,
    elevation: 2,
  },
  label: {
    textAlign: "center",
    fontWeight: "bold",
    color: "#000",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    padding: 4,
    marginHorizontal: 8,
    textAlign: "center",
    backgroundColor: "#FFF",
  },
  addButton: {
    marginTop: 16,
    backgroundColor: "#4CAF50",
  },
});

export default ExerciseCard;
