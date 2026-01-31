import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import RoutineDetailScreen from "../RoutineDetailScreen";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as RoutineService from "../../services/routineService";
import { notificationService } from "../../../../services/notificationService";
import { useWorkoutInProgressStore } from "../../../../store/useWorkoutInProgressStore";
import { useAuthStore } from "../../../../store/useAuthStore";
// Increase timeout
jest.setTimeout(120000);

// Mocks
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    setOptions: jest.fn(),
    goBack: jest.fn(),
    setParams: jest.fn(),
    reset: jest.fn(),
  }),
  useRoute: () => ({ params: { routineId: "test-routine-1" } }),
  useFocusEffect: jest.fn((cb) => cb()),
}));

jest.mock("../../../../contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: { background: "white", primary: "blue", text: "black" },
  }),
}));

jest.mock("../../services/routineService", () => ({
  getRoutineById: jest.fn().mockResolvedValue({
    id: "test-routine-1",
    name: "Routine A",
    title: "Routine A", // Required
    exercises: [
      {
        id: "ex1",
        name: "Push Ups",
        sets: [{ id: "s1", reps: 10, weight: 0, completed: false }],
      },
    ],
  }),
  saveRoutineSession: jest.fn().mockResolvedValue({ id: "session-1" }),
  updateRoutineById: jest.fn().mockResolvedValue({ id: "test-routine-1" }),
  findAllRoutineSessions: jest.fn().mockResolvedValue([]),
}));

jest.mock("../../../../services/notificationService", () => ({
  notificationService: {
    cancelAllNotifications: jest.fn(),
    scheduleRestTimerNotification: jest.fn(),
    cancelAllRestTimers: jest.fn(),
    startRestTimer: jest.fn().mockResolvedValue("notif-1"),
    cancelRestTimer: jest.fn(),
  },
}));

jest.mock("react-native-uuid", () => ({
  v4: () => "test-uuid",
}));

jest.mock(
  "expo-av",
  () => ({
    Audio: {
      Sound: {
        createAsync: jest.fn().mockResolvedValue({
          sound: { playAsync: jest.fn(), unloadAsync: jest.fn() },
        }),
      },
    },
  }),
  { virtual: true },
);

// Mock Child Components
// Path MUST be ../../ because we are in src/features/routine/screens/__tests__
jest.mock("../../components/ExerciseCard/ExerciseCard", () => {
  const { View, Text } = require("react-native");
  return (props: any) => (
    <View>
      <Text>{props.exercise.name}</Text>
    </View>
  );
});

describe("RoutineDetailScreen Integration", () => {
  it("should complete a workout flow", async () => {
    // 1. Setup State
    useAuthStore.setState({ user: { id: "u1" } as any });
    useWorkoutInProgressStore.setState({
      workoutInProgress: null,
    });

    // 2. Render
    const { getByText } = render(<RoutineDetailScreen />);

    // 3. Wait for Routine Load
    await waitFor(() => expect(getByText("Routine A")).toBeTruthy(), {
      timeout: 10000,
    });

    // 4. Start Workout
    const startButton = getByText(/Iniciar/i);
    fireEvent.press(startButton);

    // Verify "Finish Workout" appears (UI shows "Finalizar")
    await waitFor(() => expect(getByText(/Finalizar/i)).toBeTruthy());

    // 5. Finish Workout
    const finishButton = getByText(/Finalizar/i);
    fireEvent.press(finishButton);

    // 6. Confirm Save
    // "Guardar de todas formas" is in ShortWorkoutConfirmModal
    await waitFor(() =>
      expect(getByText(/Guardar de todas formas/i)).toBeTruthy(),
    );
    const confirmButton = getByText(/Guardar de todas formas/i);
    fireEvent.press(confirmButton);

    // 7. Verify Save
    await waitFor(() => {
      expect(RoutineService.saveRoutineSession).toHaveBeenCalled();
    });
  });
});
