import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";
import ReusableCameraView from "../ReusableCameraView";

// Mock ThemeContext
jest.mock("../../../../contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      primary: "#007AFF",
      background: "#000000",
      text: "#FFFFFF",
      textSecondary: "#888888",
      error: "#FF3B30",
    },
  }),
}));

// Mock Expo Camera
jest.mock("expo-camera", () => ({
  useCameraPermissions: jest.fn(() => [
    { granted: true, status: "granted", canAskAgain: true }, // Permission status
    jest.fn().mockResolvedValue({ granted: true, status: "granted" }), // Request permission function
  ]),
  CameraView: jest.fn(({ onBarcodeScanned }) => {
    const { View } = require("react-native");
    return (
      <View
        testID="mock-camera-view"
        onTouchEnd={() => onBarcodeScanned({ data: "123" })}
      />
    );
  }),
}));

// Mock Expo Linking
jest.mock("react-native/Libraries/Linking/Linking", () => ({
  openSettings: jest.fn(),
}));

describe("ReusableCameraView", () => {
  const mockOnClose = jest.fn();
  const mockOnScan = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders camera view when permission is granted", () => {
    const { getByText } = render(
      <ReusableCameraView
        onCloseCamera={mockOnClose}
        onBarCodeScanned={mockOnScan}
      />,
    );
    expect(getByText("Escanear Código")).toBeTruthy();
  });

  it("renders permission request view when permission is not granted", () => {
    const { useCameraPermissions } = require("expo-camera");
    const mockRequest = jest
      .fn()
      .mockResolvedValue({ granted: true, status: "granted" });
    useCameraPermissions.mockReturnValue([
      { granted: false, canAskAgain: true },
      mockRequest,
    ]);

    const { getByText } = render(
      <ReusableCameraView
        onCloseCamera={mockOnClose}
        onBarCodeScanned={mockOnScan}
      />,
    );

    expect(getByText("Permiso de Cámara")).toBeTruthy();

    fireEvent.press(getByText("Permitir Cámara"));
    expect(mockRequest).toHaveBeenCalled();
  });

  it("handles close button press", () => {
    const { useCameraPermissions } = require("expo-camera");
    useCameraPermissions.mockReturnValue([
      { granted: true, status: "granted", canAskAgain: true },
      jest.fn(),
    ]);

    const { getByTestId } = render(
      <ReusableCameraView
        onCloseCamera={mockOnClose}
        onBarCodeScanned={mockOnScan}
      />,
    );

    fireEvent.press(getByTestId("close-camera-button"));
    expect(mockOnClose).toHaveBeenCalled();
  });
});
