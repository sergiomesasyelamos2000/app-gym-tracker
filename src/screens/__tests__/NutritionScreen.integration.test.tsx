import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import NutritionScreen from "../NutritionScreen";
import * as NutritionService from "../../features/nutrition/services/nutritionService";
import chatReducer from "../../store/chatSlice";
import { useAuthStore } from "../../store/useAuthStore";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

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
  it("should send a message to the chatbot and display the response", async () => {
    // 1. Setup Store
    const store = configureStore({ reducer: { chat: chatReducer } });
    useAuthStore.setState({ user: { id: "1", email: "test@test.com" } as any });

    // 2. Mock Response
    (NutritionService.postText as jest.Mock).mockResolvedValue({
      reply: "Respuesta Mock",
    });

    // 3. Render
    const { getByPlaceholderText, getByText, getByTestId, debug } = render(
      <Provider store={store}>
        <NutritionScreen />
      </Provider>,
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
    // Note: If chatSlice handles response, it updates state -> UI updates.
    await waitFor(() => {
      expect(getByText("Respuesta Mock")).toBeTruthy();
    });
  });
});
