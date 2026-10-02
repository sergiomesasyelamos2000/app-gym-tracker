import React from "react";
import { Image } from "react-native";
import { render, fireEvent } from "@testing-library/react-native";
import ExerciseItem from "../ExerciseItem";
import { LIST_THUMB_TRANSFORM } from "../../../../utils/cloudinaryThumbUrl";

jest.mock("../../../../contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      card: "white",
      text: "black",
      textSecondary: "#666",
      primary: "blue",
      onPrimary: "white",
      border: "gray",
      backgroundSecondary: "#eee",
      selection: "#eef",
    },
    isDark: false,
  }),
}));

const cloudinaryUrl =
  "https://res.cloudinary.com/demo/image/upload/v1/exercises/static/bench.png";

const mockExercise = {
  id: "1",
  name: "Bench Press",
  muscularGroup: "Chest",
  imageUrl: cloudinaryUrl,
} as any;

describe("ExerciseItem", () => {
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    mockOnSelect.mockClear();
  });

  it("renders name and muscle label", () => {
    const { getByText } = render(
      <ExerciseItem
        item={mockExercise}
        isSelected={false}
        onSelect={mockOnSelect}
      />
    );
    expect(getByText("Bench Press")).toBeTruthy();
    expect(getByText("Chest")).toBeTruthy();
  });

  it("requests a Cloudinary list thumb URL", () => {
    const { UNSAFE_getByType } = render(
      <ExerciseItem
        item={mockExercise}
        isSelected={false}
        onSelect={mockOnSelect}
      />
    );
    const image = UNSAFE_getByType(Image);
    expect(image.props.source.uri).toBe(
      `https://res.cloudinary.com/demo/image/upload/${LIST_THUMB_TRANSFORM}/v1/exercises/static/bench.png`
    );
    expect(image.props.fadeDuration).toBe(0);
    expect(image.props.defaultSource).toBeUndefined();
  });

  it("passes through data URIs unchanged", () => {
    const dataUri = "data:image/png;base64,abc123";
    const { UNSAFE_getByType } = render(
      <ExerciseItem
        item={{ ...mockExercise, imageUrl: dataUri }}
        isSelected={false}
        onSelect={mockOnSelect}
      />
    );
    const image = UNSAFE_getByType(Image);
    expect(image.props.source.uri).toBe(dataUri);
  });

  it("calls onSelect when pressed", () => {
    const { getByText } = render(
      <ExerciseItem
        item={mockExercise}
        isSelected={false}
        onSelect={mockOnSelect}
      />
    );
    fireEvent.press(getByText("Bench Press"));
    expect(mockOnSelect).toHaveBeenCalledWith(mockExercise);
  });
});
