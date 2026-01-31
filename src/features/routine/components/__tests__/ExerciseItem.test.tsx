import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import ExerciseItem from "../ExerciseItem";

// Mock ThemeContext
jest.mock("../../../../contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      card: "white",
      text: "black",
      primary: "blue",
      border: "gray",
    },
    isDark: false,
  }),
}));

const mockExercise = {
  id: "1",
  name: "Bench Press",
  bodyParts: ["Chest"],
  imageUrl: null,
} as any;

describe("ExerciseItem", () => {
  const mockOnSelect = jest.fn();

  it("renders correctly", () => {
    const { getByText } = render(
      <ExerciseItem
        item={mockExercise}
        isSelected={false}
        onSelect={mockOnSelect}
      />,
    );
    expect(getByText("Bench Press")).toBeTruthy();
    expect(getByText("Grupo muscular: Chest")).toBeTruthy();
  });

  it("calls onSelect when pressed", () => {
    const { getByText } = render(
      <ExerciseItem
        item={mockExercise}
        isSelected={false}
        onSelect={mockOnSelect}
      />,
    );
    fireEvent.press(getByText("Bench Press"));
    expect(mockOnSelect).toHaveBeenCalledWith(mockExercise);
  });
});
