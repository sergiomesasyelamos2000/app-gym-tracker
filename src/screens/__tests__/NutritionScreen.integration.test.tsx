import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import NutritionScreen from "../NutritionScreen";
import * as NutritionService from "../../features/nutrition/services/nutritionService";
import { useAuthStore } from "../../store/useAuthStore";
import { useChatStore } from "../../store/useChatStore";

// Increase timeout for this file
jest.setTimeout(120000);

// Mocks
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useFocusEffect: jest.fn(),
}));
jest.mock("../../contexts/ThemeContext", () => ({
  useTheme: () => ({ theme: { background: "white", primary: "blue" } }),
}));

// Mock API - Complete imports but mocked
jest.mock("../../features/nutrition/services/nutritionService", () => ({
  postText: jest.fn(),
  getProducts: jest
    .fn()
    .mockReturnValue(Promise.resolve({ products: [], total: 0 })),
  searchProductsByName: jest
    .fn()
    .mockReturnValue(Promise.resolve({ products: [], total: 0 })),
  getDailyEntries: jest.fn().mockReturnValue(Promise.resolve({ items: [] })),
  getUserProfile: jest.fn().mockReturnValue(Promise.resolve(null)),
}));

jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest
    .fn()
    .mockResolvedValue({ status: "granted" }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
}));

describe("NutritionScreen Integration", () => {
  beforeEach(() => {
    // Reset Zustand store before each test
    useChatStore.getState().reset();
  });

  it("should send a message to the chatbot and display the response", async () => {
    // 1. Setup Auth & Chat Store
    useAuthStore.setState({ user: { id: "1", email: "test@test.com" } as any });
    useChatStore.getState().setCurrentUser("1");

    // 2. Mock Response
    (NutritionService.postText as jest.Mock).mockResolvedValue({
      reply: "Respuesta Mock",
    });

    // 3. Render (no Redux Provider needed with Zustand)
    const { getByPlaceholderText, getByText, getByTestId } = render(
      <NutritionScreen />,
    );

    // 4. Find Input
    const input = getByPlaceholderText(/escribe/i);
    fireEvent.changeText(input, "Hola mundo");
    const sendButton = getByTestId("chat-send-button");
    fireEvent.press(sendButton);

    // 5. Verify API Call
    await waitFor(() => {
      expect(NutritionService.postText).toHaveBeenCalledWith(
        "Hola mundo",
        expect.anything(),
        "1",
      );
    });

    // 6. Verify Response UI
    await waitFor(() => {
      expect(getByText("Respuesta Mock")).toBeTruthy();
    });
  });
});
