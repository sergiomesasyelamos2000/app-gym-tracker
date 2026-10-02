import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { ChatInput } from "../ChatInput";

jest.mock("../../../../contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      background: "#fff",
      backgroundSecondary: "#f8f8f8",
      card: "#fff",
      text: "#000",
      textSecondary: "#666",
      textTertiary: "#888",
      primary: "blue",
      onPrimary: "#fff",
      border: "#eee",
      inputBackground: "#f8f8f8",
      inputBorder: "#ddd",
      inputPlaceholder: "#999",
      shadowColor: "#000",
    },
  }),
}));

describe("ChatInput", () => {
  const mockOnChangeText = jest.fn();
  const mockOnSend = jest.fn();
  const mockOnPickPhoto = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders correctly", () => {
    const { getByPlaceholderText } = render(
      <ChatInput
        value=""
        onChangeText={mockOnChangeText}
        onSend={mockOnSend}
        onPickPhoto={mockOnPickPhoto}
        loading={false}
      />
    );
    expect(getByPlaceholderText("Escribe tu mensaje...")).toBeTruthy();
  });

  it("calls onChangeText when text changes", () => {
    const { getByPlaceholderText } = render(
      <ChatInput
        value=""
        onChangeText={mockOnChangeText}
        onSend={mockOnSend}
        onPickPhoto={mockOnPickPhoto}
        loading={false}
      />
    );
    fireEvent.changeText(
      getByPlaceholderText("Escribe tu mensaje..."),
      "Hello"
    );
    expect(mockOnChangeText).toHaveBeenCalledWith("Hello");
  });

  it("calls onSend when send is pressed", () => {
    const { getByTestId } = render(
      <ChatInput
        value="Hola"
        onChangeText={mockOnChangeText}
        onSend={mockOnSend}
        onPickPhoto={mockOnPickPhoto}
        loading={false}
      />
    );
    fireEvent.press(getByTestId("chat-send-button"));
    expect(mockOnSend).toHaveBeenCalled();
  });

  it("calls onPickPhoto when photo is pressed", () => {
    const { getByTestId } = render(
      <ChatInput
        value=""
        onChangeText={mockOnChangeText}
        onSend={mockOnSend}
        onPickPhoto={mockOnPickPhoto}
        loading={false}
      />
    );
    fireEvent.press(getByTestId("chat-photo-button"));
    expect(mockOnPickPhoto).toHaveBeenCalled();
  });
});
