import React from "react";
import { render } from "@testing-library/react-native";
import { MacroDistributionChart } from "../MacroDistributionChart";

// Mock CircularProgress
jest.mock("react-native-circular-progress-indicator", () => {
  const { View, Text } = require("react-native");
  return ({ title, value, valueSuffix }: any) => (
    <View testID="circular-progress">
      <Text>{title}</Text>
      <Text>
        {value}
        {valueSuffix}
      </Text>
    </View>
  );
});

// Mock useTheme
const mockTheme = {
  primary: "#6C3BAA",
  textSecondary: "#64748B",
  textTertiary: "#94A3B8",
  success: "#10B981",
  error: "#EF4444",
  border: "#E2E8F0",
  text: "#000000",
  card: "#FFFFFF",
};

jest.mock("../../../../contexts/ThemeContext", () => ({
  useTheme: () => ({ theme: mockTheme }),
}));

describe("MacroDistributionChart", () => {
  it("renders correctly", () => {
    const defaultProps = {
      carbs: { current: 100, target: 200 },
      protein: { current: 150, target: 180 },
      fat: { current: 50, target: 70 },
    };
    const { getByText, toJSON } = render(
      <MacroDistributionChart {...defaultProps} />,
    );
    expect(getByText("Carbos")).toBeTruthy();
    expect(getByText("Proteína")).toBeTruthy();
    expect(getByText("Grasa")).toBeTruthy();
  });
});
