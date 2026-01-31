import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import ImageModal from "../ImageModal";

// Mock ThemeContext
jest.mock("../../../../contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      background: "#000000",
      text: "#FFFFFF",
    },
    isDark: true,
  }),
}));

describe("ImageModal", () => {
  const mockOnClose = jest.fn();

  it("renders correctly when visible", () => {
    const { getByTestId } = render(
      <ImageModal
        visible={true}
        uri="https://example.com/image.jpg"
        onClose={mockOnClose}
      />,
    );
    // Modal acts as a container
    expect(getByTestId("modal-image")).toBeTruthy();
  });

  it("calls onClose when close button is pressed", () => {
    const { getByTestId } = render(
      <ImageModal
        visible={true}
        uri="https://example.com/image.jpg"
        onClose={mockOnClose}
      />,
    );

    fireEvent.press(getByTestId("close-modal-button"));
    expect(mockOnClose).toHaveBeenCalled();
  });
});
