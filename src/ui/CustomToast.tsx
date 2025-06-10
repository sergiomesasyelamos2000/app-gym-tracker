import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Animated,
  StyleSheet,
  TouchableOpacity,
} from "react-native";

interface CustomToastProps {
  text1: string;
  progress?: number; // Progreso opcional (valor entre 0 y 1)
  onCancel?: () => void; // Función para cancelar el temporizador
  onAddTime?: () => void; // Función para añadir tiempo
  onSubtractTime?: () => void; // Función para restar tiempo
}

const CustomToast = ({
  text1,
  progress = 1,
  onCancel,
  onAddTime,
  onSubtractTime,
}: CustomToastProps) => {
  const animatedProgress = useRef(new Animated.Value(progress)).current;

  useEffect(() => {
    animatedProgress.setValue(progress);

    if (progress !== undefined) {
      Animated.timing(animatedProgress, {
        toValue: progress,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }
  }, [progress]);

  return (
    <View style={styles.toastContainer}>
      <View style={styles.toastContent}>
        {progress > 0 && ( // Renderiza el botón solo si el progreso es mayor a 0
          <TouchableOpacity style={styles.timeButton} onPress={onSubtractTime}>
            <Text style={styles.timeButtonText}>-15s</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.toastText}>{text1}</Text>
        {progress > 0 && ( // Renderiza el botón solo si el progreso es mayor a 0
          <TouchableOpacity style={styles.timeButton} onPress={onAddTime}>
            <Text style={styles.timeButtonText}>+15s</Text>
          </TouchableOpacity>
        )}
        {onCancel && (
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        )}
      </View>
      {progress > 0 && (
        <View style={styles.progressBarContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: animatedProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    height: 80,
    width: "90%",
    backgroundColor: "tomato",
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
  },
  toastContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  toastText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  timeButton: {
    backgroundColor: "white",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginHorizontal: 5,
  },
  timeButtonText: {
    color: "tomato",
    fontWeight: "bold",
    fontSize: 14,
  },
  cancelButton: {
    backgroundColor: "white",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  cancelButtonText: {
    color: "tomato",
    fontWeight: "bold",
    fontSize: 14,
  },
  progressBarContainer: {
    width: "100%",
    height: 6,
    backgroundColor: "#ccc",
    borderRadius: 3,
    overflow: "hidden",
    marginTop: 8,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "white",
    borderRadius: 3,
  },
});

export default CustomToast;
