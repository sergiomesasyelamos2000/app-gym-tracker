import React from "react";
import { render, act } from "@testing-library/react-native";
import Spinner from "../Spinner";

// Mock the ThemeContext
jest.mock("../../../../contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      textSecondary: "#888888",
    },
  }),
}));

describe("Spinner", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders initial state correctly", () => {
    const { getByText } = render(<Spinner />);
    expect(getByText("Pensando")).toBeTruthy();
  });

  it("animates dots over time", () => {
    const { getByText } = render(<Spinner />);

    // Initial state: "Pensando"
    expect(getByText("Pensando")).toBeTruthy();

    // After 500ms: "Pensando."
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(getByText("Pensando.")).toBeTruthy();

    // After 1000ms: "Pensando.."
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(getByText("Pensando..")).toBeTruthy();

    // After 1500ms: "Pensando..."
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(getByText("Pensando...")).toBeTruthy();

    // After 2000ms: Reset to "Pensando"
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(getByText("Pensando")).toBeTruthy();
  });
});
