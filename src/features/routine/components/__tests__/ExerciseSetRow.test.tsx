import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import ExerciseSetRow from "../ExerciseCard/ExerciseSetRow";

jest.mock("../../../../contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      card: "white",
      text: "black",
      textSecondary: "#666",
      textTertiary: "#999",
      primary: "blue",
      onPrimary: "#fff",
      inputBackground: "#eee",
      backgroundSecondary: "#f3f4f6",
      border: "#e5e7eb",
      success: "#10B981",
      overlay: "rgba(0,0,0,0.5)",
      selection: "#eee",
    },
    isDark: false,
  }),
}));

jest.mock("../ExerciseCard/useSetRowLogic", () => ({
  useSetRowLogic: () => ({
    localWeight: "100",
    localReps: "10",
    localAssistedReps: "0",
    localRepsMin: "8",
    localRepsMax: "12",
    handleWeightChange: jest.fn(),
    handleRepsChange: jest.fn(),
    handleAssistedRepsChange: jest.fn(),
    handleRepsMinChange: jest.fn(),
    handleRepsMaxChange: jest.fn(),
    handleToggleCompleted: jest.fn(),
    handleAutofillFromPrevious: jest.fn(),
  }),
}));

const mockItem = {
  id: "s1",
  order: 1,
  completed: false,
  weight: 100,
  reps: 10,
  assistedReps: 0,
} as any;

describe("ExerciseSetRow", () => {
  const mockOnUpdate = jest.fn();

  it("renders set info correctly in started mode", () => {
    const { getByText, getByDisplayValue, getByLabelText } = render(
      <ExerciseSetRow
        item={mockItem}
        onUpdate={mockOnUpdate}
        repsType="reps"
        started={true}
      />
    );

    expect(getByText("1")).toBeTruthy();
    expect(getByDisplayValue("100")).toBeTruthy();
    expect(getByDisplayValue("10")).toBeTruthy();
    expect(getByLabelText("Repeticiones asistidas")).toBeTruthy();
  });

  it("hides ASIS and check when not started", () => {
    const { queryByLabelText, getByDisplayValue } = render(
      <ExerciseSetRow
        item={mockItem}
        onUpdate={mockOnUpdate}
        repsType="reps"
        started={false}
      />
    );

    expect(getByDisplayValue("100")).toBeTruthy();
    expect(queryByLabelText("Repeticiones asistidas")).toBeNull();
    expect(queryByLabelText("Serie no completada")).toBeNull();
  });

  it("renders readonly detail values as text without inputs", () => {
    const { getByText, queryByDisplayValue, queryByLabelText } = render(
      <ExerciseSetRow
        item={mockItem}
        onUpdate={mockOnUpdate}
        repsType="reps"
        started={false}
        readonly
        rowIndex={1}
      />
    );

    expect(getByText("1")).toBeTruthy();
    expect(getByText("100")).toBeTruthy();
    expect(getByText("10")).toBeTruthy();
    expect(queryByDisplayValue("100")).toBeNull();
    expect(queryByLabelText("Repeticiones asistidas")).toBeNull();
  });

  it("toggles completed with square check in started mode", () => {
    const { getByLabelText } = render(
      <ExerciseSetRow
        item={mockItem}
        onUpdate={mockOnUpdate}
        repsType="reps"
        started={true}
      />
    );

    const check = getByLabelText("Serie no completada");
    expect(check).toBeTruthy();
    fireEvent.press(check);
  });
});
