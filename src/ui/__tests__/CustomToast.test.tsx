import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";
import CustomToast from "../CustomToast";
import * as Haptics from "expo-haptics";

jest.mock("../../contexts/ThemeContext", () => ({
  useTheme: () => ({
    isDark: false,
    theme: {
      primary: "#6C3BAA",
      warning: "#F59E0B",
      error: "#EF4444",
      text: "#111827",
      textSecondary: "#6B7280",
      surfaceElevated: "#FFFFFF",
      border: "#E5E7EB",
      shadowColor: "#000000",
    },
  }),
}));

describe("CustomToast", () => {
  const mockCancel = jest.fn();
  const mockAddTime = jest.fn();
  const mockSubtractTime = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders correctly with required props", () => {
    const { getByText } = render(<CustomToast text1="Hello" />);
    expect(getByText("Hello")).toBeTruthy();
  });

  it("renders secondary text when provided", () => {
    const { getByText } = render(
      <CustomToast text1="Title" text2="Subtitle" />
    );
    expect(getByText("Subtitle")).toBeTruthy();
  });

  it("calls onCancel when Omitir is pressed", async () => {
    const { getByText } = render(
      <CustomToast text1="Test" onCancel={mockCancel} />
    );

    await act(async () => {
      fireEvent.press(getByText("Omitir"));
    });

    expect(mockCancel).toHaveBeenCalled();
    expect(Haptics.notificationAsync).toHaveBeenCalled();
  });

  it("calls onAddTime when +15s button is pressed", async () => {
    const { getByText } = render(
      <CustomToast text1="Test" onAddTime={mockAddTime} progress={0.5} />
    );

    await act(async () => {
      fireEvent.press(getByText("+15s"));
    });

    expect(mockAddTime).toHaveBeenCalled();
    expect(Haptics.impactAsync).toHaveBeenCalled();
  });

  it("calls onSubtractTime when -15s button is pressed", async () => {
    const { getByText } = render(
      <CustomToast
        text1="Test"
        onSubtractTime={mockSubtractTime}
        progress={0.5}
      />
    );

    await act(async () => {
      fireEvent.press(getByText("−15s"));
    });

    expect(mockSubtractTime).toHaveBeenCalled();
  });

  it("keeps ±15s controls visible when progress is 0", () => {
    const { getByText } = render(
      <CustomToast
        text1="Test"
        onAddTime={mockAddTime}
        onSubtractTime={mockSubtractTime}
        progress={0}
      />
    );

    expect(getByText("+15s")).toBeTruthy();
    expect(getByText("−15s")).toBeTruthy();
  });

  it("unmounts safely while progress is changing", () => {
    const { rerender, unmount } = render(
      <CustomToast text1="0:30" progress={1} onCancel={mockCancel} />
    );

    rerender(
      <CustomToast text1="0:05" progress={0.2} onCancel={mockCancel} />
    );

    expect(() => unmount()).not.toThrow();
  });
});
