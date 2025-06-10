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
}

const CustomToast = ({ text1, progress = 1, onCancel }: CustomToastProps) => {
  const animatedProgress = useRef(new Animated.Value(progress)).current;

  useEffect(() => {
    // Sincroniza el valor inicial de la animación con el valor de `progress`
    animatedProgress.setValue(progress);

    // Solo anima si el valor cambia
    if (progress !== undefined) {
      Animated.timing(animatedProgress, {
        toValue: progress,
        duration: 500, // Actualización rápida para reflejar cambios dinámicos
        useNativeDriver: false,
      }).start();
    }
  }, [progress]);

  return (
    <View style={styles.toastContainer}>
      <View style={styles.toastContent}>
        <Text style={styles.toastText}>{text1}</Text>
        {onCancel && (
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        )}
      </View>
      {progress > 0 && ( // Solo muestra la barra si el progreso es mayor a 0
        <View style={styles.progressBarContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: animatedProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"], // La barra disminuye de derecha a izquierda
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
    backgroundColor: "#ccc", // Fondo de la barra
    borderRadius: 3,
    overflow: "hidden", // Asegura que la barra no se desborde
    marginTop: 8,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "white",
    borderRadius: 3,
  },
});

export default CustomToast;
