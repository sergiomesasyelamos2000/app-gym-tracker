import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTheme } from "../../../../contexts/ThemeContext";

interface Props {
  visible: boolean;
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
}

const DISMISS_DISTANCE = 40;
const DISMISS_VELOCITY = 0.5;

const UndoSnackbar = ({ visible, message, onUndo, onDismiss }: Props) => {
  const { theme } = useTheme();
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const onDismissRef = useRef(onDismiss);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  onDismissRef.current = onDismiss;

  const clearAutoDismissTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const startAutoDismissTimer = () => {
    clearAutoDismissTimer();
    timerRef.current = setTimeout(() => {
      onDismissRef.current();
    }, 4000);
  };

  useEffect(() => {
    if (visible) {
      translateY.setValue(100);
      opacity.setValue(0);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      startAutoDismissTimer();

      return () => clearAutoDismissTimer();
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
    return undefined;
  }, [visible]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          gestureState.dy > 4 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderGrant: () => {
          clearAutoDismissTimer();
        },
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            translateY.setValue(gestureState.dy);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (
            gestureState.dy > DISMISS_DISTANCE ||
            gestureState.vy > DISMISS_VELOCITY
          ) {
            onDismissRef.current();
            return;
          }

          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 10,
          }).start();
          startAutoDismissTimer();
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 10,
          }).start();
          startAutoDismissTimer();
        },
      }),
    [translateY]
  );

  if (!visible) return null;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={styles.messageContainer}>
        <Icon name="delete-outline" size={20} color={theme.textSecondary} />
        <Text style={[styles.message, { color: theme.text }]}>{message}</Text>
      </View>
      <TouchableOpacity
        onPress={onUndo}
        style={[
          styles.undoButton,
          { backgroundColor: theme.primary, shadowColor: theme.shadowColor },
        ]}
        activeOpacity={0.8}
      >
        <Text style={[styles.undoText, { color: theme.onPrimary }]}>DESHACER</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 14,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    borderWidth: 1,
    zIndex: 1000,
  },
  messageContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    marginRight: 12,
  },
  message: {
    fontSize: 15,
    fontWeight: "600",
  },
  undoButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  undoText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});

export default UndoSnackbar;
