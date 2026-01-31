import React from "react";
import { render } from "@testing-library/react-native";
import { MessageBubble } from "../MessageBubble";

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

// Mock ExportButton (child component)
jest.mock("../ExportButton", () => ({
  ExportButton: () => {
    const { View } = require("react-native");
    return <View testID="mock-export-button" />;
  },
}));

describe("MessageBubble", () => {
  it("renders user message correctly", () => {
    const message = { id: 1, text: "Hello World", sender: "user" as const };
    const { getByText } = render(<MessageBubble message={message} />);
    expect(getByText("Hello World")).toBeTruthy();
  });

  it("renders bot message correctly", () => {
    const message = { id: 2, text: "Bot Response", sender: "bot" as const };
    const { getByText } = render(<MessageBubble message={message} />);
    expect(getByText("Bot Response")).toBeTruthy();
  });
});
