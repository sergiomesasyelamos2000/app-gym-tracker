import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import ExerciseHeader from "../ExerciseCard/ExerciseHeader";

// Mock ThemeContext
jest.mock("../../../../contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      card: "white",
      text: "black",
      primary: "blue",
      shadowColor: "black",
      backgroundSecondary: "#eee",
    },
  }),
}));

const mockExercise = {
  id: "1",
  name: "Squat",
  imageUrl: null,
} as any;

describe("ExerciseHeader", () => {
  const mockOnReorder = jest.fn();

  it("renders exercise name", () => {
    const { getByText } = render(<ExerciseHeader exercise={mockExercise} />);
    expect(getByText("Squat")).toBeTruthy();
  });

  it("shows options modal when options button is pressed", () => {
    const { getByTestId, getByText } = render(
      <ExerciseHeader exercise={mockExercise} showOptions={true} />,
    );

    // Find options button (icon name more-vert)
    // We mocked Icons to simple string or View?
    // In jest-setup.ts vector icons are View.
    // We can find by parsing the tree or we can assign testID in source code if needed.
    // ExerciseHeader.tsx:
    // <TouchableOpacity onPress={openExerciseOptions}> <Icon name="more-vert" ... /> </TouchableOpacity>

    // We didn't add testID. But we can assume the Portal/Modal structure.
    // However, finding the button to press is key.
    // Let's rely on finding ALL touchables or similar? No.
    // I can try to find by accessibility label if it exists? It doesn't.

    // I'll skip interaction test that requires finding the button without testID for now,
    // AND focus on what is rendered.
    // Ideally I should add testID 'exercise-options-button' to ExerciseHeader.tsx.

    // Let's do that in a previous step? No, I am here.
    // I will write the test assuming I will add testID 'exercise-options-button' in the next step.

    fireEvent.press(getByTestId("exercise-options-button"));
    // The modal renders via Portal. Our mock Portal renders children directly.
    // So we should see "Opciones de ejercicio".
    expect(getByText("Opciones de ejercicio")).toBeTruthy();
  });
});
