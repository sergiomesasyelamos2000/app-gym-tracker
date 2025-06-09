import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { ProgressBar } from "react-native-paper";

interface CustomToastProps {
  text1: string;
  progress?: number; // de 0 a 1
  totalTime?: number; // opcional: en segundos
  remainingTime?: number; // opcional: en segundos
}

const CustomToast = ({
  text1,
  progress,
  totalTime,
  remainingTime,
}: CustomToastProps) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in al aparecer el toast
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Fade out tras 1.5 segundos si no hay temporizador
    if (!totalTime && !remainingTime) {
      const timeout = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, 1500);

      return () => clearTimeout(timeout);
    }
  }, [fadeAnim, totalTime, remainingTime]);

  // Calcular progreso si no se pasa explícitamente
  const computedProgress =
    totalTime && remainingTime ? remainingTime / totalTime : progress ?? 1;

  return (
    <Animated.View style={[styles.toastContainer, { opacity: fadeAnim }]}>
      <Text style={styles.toastText}>{text1}</Text>
      {computedProgress !== undefined && computedProgress < 1 && (
        <ProgressBar
          progress={computedProgress}
          color="#4CAF50"
          style={styles.progressBar}
        />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    backgroundColor: "#333",
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  toastText: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
});

export default CustomToast;
