import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";
import ReusableCameraView from "../ReusableCameraView";

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

const mockOnBarcodeScannedProp = jest.fn();

jest.mock("expo-camera", () => ({
  useCameraPermissions: jest.fn(() => [
    { granted: true, status: "granted", canAskAgain: true },
    jest.fn().mockResolvedValue({ granted: true, status: "granted" }),
  ]),
  CameraView: jest.fn((props) => {
    mockOnBarcodeScannedProp.mockImplementation(props.onBarcodeScanned);
    const { View } = require("react-native");
    return <View testID="mock-camera-view" />;
  }),
}));

jest.mock("react-native/Libraries/Linking/Linking", () => ({
  openSettings: jest.fn(),
}));

describe("ReusableCameraView", () => {
  const mockOnClose = jest.fn();
  const mockOnScan = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders camera view when permission is granted", () => {
    const { getByText } = render(
      <ReusableCameraView
        onCloseCamera={mockOnClose}
        onBarCodeScanned={mockOnScan}
      />,
    );
    expect(getByText("Escanear Código")).toBeTruthy();
    expect(
      getByText("Enfoca el código de barras del envase, no el QR"),
    ).toBeTruthy();
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

  it("ignores URL QR payloads", () => {
    const { useCameraPermissions } = require("expo-camera");
    useCameraPermissions.mockReturnValue([
      { granted: true, status: "granted", canAskAgain: true },
      jest.fn(),
    ]);

    render(
      <ReusableCameraView
        onCloseCamera={mockOnClose}
        onBarCodeScanned={mockOnScan}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    act(() => {
      mockOnBarcodeScannedProp({
        data: "https://prozis.com/p/123",
        type: "qr",
      });
      mockOnBarcodeScannedProp({
        data: "https://prozis.com/p/123",
        type: "qr",
      });
    });

    expect(mockOnScan).not.toHaveBeenCalled();
  });

  it("requires two identical EAN reads before accepting", () => {
    const { useCameraPermissions } = require("expo-camera");
    useCameraPermissions.mockReturnValue([
      { granted: true, status: "granted", canAskAgain: true },
      jest.fn(),
    ]);

    const { getByText, queryByText } = render(
      <ReusableCameraView
        onCloseCamera={mockOnClose}
        onBarCodeScanned={mockOnScan}
      />,
    );

    act(() => {
      mockOnBarcodeScannedProp({
        data: "5600380893930",
        type: "ean13",
      });
    });
    expect(mockOnScan).not.toHaveBeenCalled();
    expect(queryByText("Buscando producto…")).toBeNull();

    act(() => {
      mockOnBarcodeScannedProp({
        data: "5600380893930",
        type: "ean13",
      });
    });

    expect(getByText("Buscando producto…")).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(mockOnScan).toHaveBeenCalledWith("5600380893930", {
      type: "ean13",
    });
  });
});
