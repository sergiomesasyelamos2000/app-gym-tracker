import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import ExerciseSetRow from "../ExerciseCard/ExerciseSetRow";

// Mock ThemeContext
jest.mock("../../../../contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      card: "white",
      text: "black",
      primary: "blue",
      inputBackground: "#eee",
    },
    isDark: false,
  }),
}));

// Mock useSetRowLogic
jest.mock("../ExerciseCard/useSetRowLogic", () => ({
  useSetRowLogic: () => ({
    localWeight: "100",
    localReps: "10",
    handleWeightChange: jest.fn(),
    handleRepsChange: jest.fn(),
    handleToggleCompleted: jest.fn(),
  }),
}));

const mockItem = {
  id: "s1",
  order: 1,
  completed: false,
  weight: 100,
  reps: 10,
} as any;

describe("ExerciseSetRow", () => {
  const mockOnUpdate = jest.fn();

  it("renders set info correctly", () => {
    const { getByText, getByDisplayValue } = render(
      <ExerciseSetRow
        item={mockItem}
        onUpdate={mockOnUpdate}
        repsType="reps"
        started={true}
      />,
    );

    expect(getByText("1")).toBeTruthy(); // Order
    expect(getByDisplayValue("100")).toBeTruthy(); // Weight
    expect(getByDisplayValue("10")).toBeTruthy(); // Reps
  });
});
