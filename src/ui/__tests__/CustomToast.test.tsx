import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";
import CustomToast from "../CustomToast";
import * as Haptics from "expo-haptics";

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
      <CustomToast text1="Title" text2="Subtitle" />,
    );
    expect(getByText("Subtitle")).toBeTruthy();
  });

  it("calls onCancel when cancel button is pressed", async () => {
    const { getByText } = render(
      <CustomToast text1="Test" onCancel={mockCancel} />,
    );

    await act(async () => {
      fireEvent.press(getByText("X"));
    });

    expect(mockCancel).toHaveBeenCalled();
    expect(Haptics.notificationAsync).toHaveBeenCalled();
  });

  it("calls onAddTime when +15s button is pressed", async () => {
    const { getByText } = render(
      <CustomToast text1="Test" onAddTime={mockAddTime} progress={0.5} />,
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
      />,
    );

    await act(async () => {
      fireEvent.press(getByText("−15s"));
    });

    expect(mockSubtractTime).toHaveBeenCalled();
  });

  it("does not render action buttons when progress is 0", () => {
    const { queryByText } = render(
      <CustomToast
        text1="Test"
        onAddTime={mockAddTime}
        onSubtractTime={mockSubtractTime}
        progress={0}
      />,
    );

    expect(queryByText("+15s")).toBeNull();
    expect(queryByText("−15s")).toBeNull();
  });
});
