import React from "react";
import { render } from "@testing-library/react-native";
import { DailyCalorieChart } from "../DailyCalorieChart";

// Mock useTheme
const mockTheme = {
  primary: "#6C3BAA",
  textSecondary: "#64748B",
  textTertiary: "#94A3B8",
  success: "#10B981",
  error: "#EF4444",
  border: "#E2E8F0",
};

jest.mock("../../../../contexts/ThemeContext", () => ({
  useTheme: () => ({ theme: mockTheme }),
}));

describe("DailyCalorieChart", () => {
  it("renders without crashing", () => {
    const result = render(<DailyCalorieChart consumed={1500} target={2000} />);
    expect(result).toBeTruthy();
  });

  it("accepts consumed and target props", () => {
    const result = render(<DailyCalorieChart consumed={2500} target={2000} />);
    expect(result).toBeTruthy();
  });
});
