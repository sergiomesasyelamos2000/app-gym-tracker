import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";
import CustomToast from "../CustomToast";
import * as Haptics from "expo-haptics";

jest.mock("../../contexts/ThemeContext", () => ({
  useTheme: () => ({
    isDark: false,
    theme: {
      primary: "#6C3BAA",
      onPrimary: "#FFFFFF",
      warning: "#F59E0B",
      error: "#EF4444",
      text: "#111827",
      textSecondary: "#6B7280",
      surface: "#FFFFFF",
      surfaceElevated: "#FFFFFF",
      divider: "#E5E7EB",
      border: "#E5E7EB",
      shadowColor: "#000000",
    },
  }),
}));

describe("CustomToast", () => {
  const mockCancel = jest.fn();
  const mockAddTime = jest.fn();
  const mockSubtractTime = jest.fn();
  const mockDismissKeyboard = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders countdown text", () => {
    const { getByText, queryByText } = render(
      <CustomToast text1="02:20" />
    );
    expect(getByText("02:20")).toBeTruthy();
    expect(queryByText("Descanso")).toBeNull();
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

  it("calls onAddTime when +15 button is pressed", async () => {
    const { getByText } = render(
      <CustomToast text1="Test" onAddTime={mockAddTime} progress={0.5} />
    );

    await act(async () => {
      fireEvent.press(getByText("+15"));
    });

    expect(mockAddTime).toHaveBeenCalled();
    expect(Haptics.impactAsync).toHaveBeenCalled();
  });

  it("calls onSubtractTime when −15 button is pressed", async () => {
    const { getByText } = render(
      <CustomToast
        text1="Test"
        onSubtractTime={mockSubtractTime}
        progress={0.5}
      />
    );

    await act(async () => {
      fireEvent.press(getByText("−15"));
    });

    expect(mockSubtractTime).toHaveBeenCalled();
  });

  it("keeps ±15 controls visible when progress is 0", () => {
    const { getByText } = render(
      <CustomToast
        text1="Test"
        onAddTime={mockAddTime}
        onSubtractTime={mockSubtractTime}
        progress={0}
      />
    );

    expect(getByText("+15")).toBeTruthy();
    expect(getByText("−15")).toBeTruthy();
  });

  it("keeps progress fill brand primary at low remaining", () => {
    const { getByTestId, rerender } = render(
      <CustomToast text1="0:30" progress={1} />
    );

    expect(getByTestId("rest-progress-fill")).toHaveStyle({
      backgroundColor: "#6C3BAA",
    });

    rerender(<CustomToast text1="0:05" progress={0.2} />);

    expect(getByTestId("rest-progress-fill")).toHaveStyle({
      backgroundColor: "#6C3BAA",
    });
  });

  it("keeps Omitir and separate keyboard dismiss when keyboard handler is set", async () => {
    const { getByText, getByLabelText } = render(
      <CustomToast
        text1="01:00"
        onCancel={mockCancel}
        onDismissKeyboard={mockDismissKeyboard}
      />
    );

    expect(getByText("Omitir")).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByLabelText("Ocultar teclado"));
    });

    expect(mockDismissKeyboard).toHaveBeenCalled();
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
