import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

const Spinner: React.FC = () => {
  const [dots, setDots] = useState("");
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length < 3 ? prev + "." : ""));
    }, 500);
    return () => clearInterval(interval);
  }, []);
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Pensando{dots}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Alineación dentro de la burbuja, ajustar según diseño
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  text: {
    fontStyle: "italic", // por ejemplo
    color: "#555",
  },
});

export default Spinner;
