import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import ExerciseNotes from "../ExerciseCard/ExerciseNotes";

// Mock ThemeContext
jest.mock("../../../../contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      card: "white",
      text: "black",
      primary: "blue",
      error: "red",
    },
    isDark: false,
  }),
}));

describe("ExerciseNotes", () => {
  const mockOnChange = jest.fn();
  const notes = [
    { id: "1", text: "Note 1", createdAt: new Date().toISOString() },
  ];

  it("renders notes", () => {
    const { getByText } = render(
      <ExerciseNotes notes={notes} onChange={mockOnChange} />,
    );
    expect(getByText("Note 1")).toBeTruthy();
  });

  it("can add a new note", () => {
    const { getByText, getByPlaceholderText } = render(
      <ExerciseNotes notes={[]} onChange={mockOnChange} />,
    );

    // Open add mode
    fireEvent.press(getByText("Añadir nota"));

    // Type note
    const input = getByPlaceholderText("Escribe tu nota...");
    fireEvent.changeText(input, "New Note");

    // Save
    fireEvent.press(getByText("Guardar"));

    expect(mockOnChange).toHaveBeenCalled();
  });
});
