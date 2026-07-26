import { useIsFocused } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { RFValue } from "react-native-responsive-fontsize";

type LiveClockProps = {
  containerStyle?: StyleProp<ViewStyle>;
  timeStyle?: StyleProp<TextStyle>;
  dateStyle?: StyleProp<TextStyle>;
};

/**
 * Clock that only ticks while the hosting screen is focused.
 * Keeps parent screens from paying 1Hz re-renders when the tab is blurred.
 */
export default function LiveClock({
  containerStyle,
  timeStyle,
  dateStyle,
}: LiveClockProps) {
  const isFocused = useIsFocused();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!isFocused) return;

    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [isFocused]);

  const formattedTime = now.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const formattedDate = now.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.time, timeStyle]}>{formattedTime}</Text>
      <Text style={[styles.date, dateStyle]}>{formattedDate}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "flex-end",
  },
  time: {
    color: "#FFFFFF",
    fontSize: RFValue(18),
    fontWeight: "bold",
    marginBottom: 2,
  },
  date: {
    color: "#E0D7F5",
    fontSize: RFValue(12),
    fontWeight: "500",
    textTransform: "capitalize",
  },
});
