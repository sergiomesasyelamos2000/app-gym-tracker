import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import CircularProgress from "react-native-circular-progress-indicator";
import { useTheme } from "../../../contexts/ThemeContext";

interface MacroData {
  current: number;
  target: number;
}

interface Props {
  protein: MacroData;
  carbs: MacroData;
  fat: MacroData;
}

export const MacroDistributionChart: React.FC<Props> = ({
  protein,
  carbs,
  fat,
}) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  // Animation values
  const animatedCarbs = useRef(new Animated.Value(0)).current;
  const animatedProtein = useRef(new Animated.Value(0)).current;
  const animatedFat = useRef(new Animated.Value(0)).current;

  // Display values (listeners update these)
  const [displayCarbs, setDisplayCarbs] = useState(0);
  const [displayProtein, setDisplayProtein] = useState(0);
  const [displayFat, setDisplayFat] = useState(0);

  useEffect(() => {
    if (process.env.NODE_ENV === "test") return;

    const listeners = [
      animatedCarbs.addListener(({ value }) => setDisplayCarbs(value)),
      animatedProtein.addListener(({ value }) => setDisplayProtein(value)),
      animatedFat.addListener(({ value }) => setDisplayFat(value)),
    ];

    return () => {
      listeners.forEach((id, index) => {
        [animatedCarbs, animatedProtein, animatedFat][index].removeListener(id);
      });
    };
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === "test") return;

    Animated.parallel([
      Animated.timing(animatedCarbs, {
        toValue: carbs.current,
        duration: 800,
        useNativeDriver: false,
      }),
      Animated.timing(animatedProtein, {
        toValue: protein.current,
        duration: 800,
        useNativeDriver: false,
      }),
      Animated.timing(animatedFat, {
        toValue: fat.current,
        duration: 800,
        useNativeDriver: false,
      }),
    ]).start();
  }, [carbs.current, protein.current, fat.current]);

  const renderMacroCircle = (
    key: string,
    label: string,
    color: string,
    value: number,
    goal: number,
    current: number,
  ) => {
    const remaining = goal - value;

    return (
      <View key={key} style={styles.macroCircle}>
        <CircularProgress
          value={value}
          radius={50}
          maxValue={Math.max(goal, 1)} // Prevent divide by zero visual issues
          title={label}
          titleStyle={styles.circleTitle}
          progressValueColor={theme.text}
          activeStrokeColor={color}
          inActiveStrokeColor={theme.border}
          inActiveStrokeOpacity={0.3}
          valueSuffix="g"
        />
        <Text style={styles.macrosRemaining}>
          {Math.max(0, Math.round(goal - current))}g restantes
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.macrosSection}>
      <Text style={styles.sectionTitle}>Macronutrientes</Text>
      <View style={styles.macrosRow}>
        {renderMacroCircle(
          "carbs",
          "Carbos",
          "#FFB74D",
          displayCarbs,
          carbs.target,
          carbs.current,
        )}
        {renderMacroCircle(
          "protein",
          "Proteína",
          "#2196F3",
          displayProtein,
          protein.target,
          protein.current,
        )}
        {renderMacroCircle(
          "fat",
          "Grasa",
          "#FF9800",
          displayFat,
          fat.target,
          fat.current,
        )}
      </View>
    </View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    macrosSection: {
      backgroundColor: theme.card,
      padding: 20,
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.text,
      marginBottom: 16,
    },
    macrosRow: { flexDirection: "row", justifyContent: "space-between" },
    macroCircle: { alignItems: "center" },
    circleTitle: { fontSize: 12, color: theme.textSecondary },
    macrosRemaining: {
      fontSize: 11,
      color: theme.textTertiary,
      marginTop: 8,
      textAlign: "center",
    },
  });
