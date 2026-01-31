import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { ExportButton } from "../ExportButton";

// Mock ThemeContext
jest.mock("../../../../contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      primary: "blue",
      card: "#fff",
      text: "#000",
    },
  }),
}));

// Mock AuthStore
jest.mock("../../../../store/useAuthStore", () => ({
  useAuthStore: (selector: any) =>
    selector({
      user: { name: "Test User" },
    }),
}));

// Mock ExportUtils
jest.mock("../../../../utils/exportUtils", () => ({
  exportToCSV: jest.fn(),
  exportToPDF: jest.fn(),
}));

import { exportToCSV } from "../../../../utils/exportUtils";

describe("ExportButton", () => {
  it("renders correctly", () => {
    const { getByText } = render(<ExportButton content="Data" />);
    expect(getByText("Exportar")).toBeTruthy();
  });

  it("opens modal on press", () => {
    const { getByText } = render(<ExportButton content="Data" />);
    fireEvent.press(getByText("Exportar"));
    expect(getByText("Exportar Dieta")).toBeTruthy(); // Modal title
  });

  it("calls exportToCSV when CSV option selected", async () => {
    const { getByText } = render(<ExportButton content="Data" />);
    fireEvent.press(getByText("Exportar"));
    fireEvent.press(getByText("CSV"));
    // It's async, but strictly mocking return value means it might be instant.
    expect(exportToCSV).toHaveBeenCalled();
  });
});
