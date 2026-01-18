import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  postPhoto,
  postText,
} from "../features/nutrition/services/nutritionService";

export interface Message {
  id: number;
  text: string;
  sender: "user" | "bot";
  imageUri?: string;
}

interface ChatState {
  messages: Message[];
  loading: boolean;
  nextId: number;
}

const getChatStorageKey = (userId: string) => `@gym_app_chat_history_${userId}`;

const initialState: ChatState = {
  messages: [
    {
      id: 1,
      text: "¡Hola! Soy tu asistente de nutrición. ¿Cómo puedo ayudarte hoy?",
      sender: "bot",
    },
  ],
  loading: false,
  nextId: 2,
};

// Thunk para cargar historial desde AsyncStorage
export const loadChatHistory = createAsyncThunk(
  "chat/loadHistory",
  async (userId: string) => {
    if (!userId) return null;
    try {
      const stored = await AsyncStorage.getItem(getChatStorageKey(userId));
      if (stored) {
        return JSON.parse(stored);
      }
      return null;
    } catch (error) {
      console.error("Error loading chat history:", error);
      return null;
    }
  },
);

// Thunk para guardar historial en AsyncStorage
export const saveChatHistory = createAsyncThunk(
  "chat/saveHistory",
  async ({ state, userId }: { state: ChatState; userId: string }) => {
    if (!userId) return;
    try {
      await AsyncStorage.setItem(
        getChatStorageKey(userId),
        JSON.stringify({
          messages: state.messages,
          nextId: state.nextId,
        }),
      );
    } catch (error) {
      console.error("Error saving chat history:", error);
    }
  },
);

// Thunk para envío de mensaje de texto
export const sendMessageThunk = createAsyncThunk(
  "chat/sendMessage",
  async (payload: { text: string; userId?: string }, thunkAPI) => {
    const state = thunkAPI.getState() as any;
    const messages = state.chat.messages;

    // Build history from existing messages
    const history = messages.map((msg: Message) => ({
      role: msg.sender === "user" ? "user" : "bot",
      content: msg.text,
    }));

    const data = await postText(payload.text, history, payload.userId);
    return data.reply;
  },
);

// Thunk para envío de imagen
export const sendPhotoThunk = createAsyncThunk(
  "chat/sendPhoto",
  async (fileData: FormData, thunkAPI) => {
    const data = await postPhoto(fileData);
    return data.items;
  },
);

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<Omit<Message, "id">>) => {
      state.messages.push({
        ...action.payload,
        id: state.nextId,
      });
      state.nextId += 1;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    clearHistory: (state, action: PayloadAction<string>) => {
      state.messages = [
        {
          id: state.nextId,
          text: "¡Hola! Soy tu asistente de nutrición. ¿Cómo puedo ayudarte hoy?",
          sender: "bot",
        },
      ];
      state.nextId += 1;
      if (action.payload) {
        AsyncStorage.removeItem(getChatStorageKey(action.payload)).catch(
          (err) => console.error("Error clearing chat history:", err),
        );
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadChatHistory.fulfilled, (state, action) => {
        if (action.payload) {
          state.messages = action.payload.messages;
          state.nextId = action.payload.nextId;
        }
      })
      .addCase(sendMessageThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(sendMessageThunk.fulfilled, (state, action) => {
        state.loading = false;
        // Agregar respuesta del bot
        state.messages.push({
          id: state.nextId,
          text: action.payload,
          sender: "bot",
        });
        state.nextId += 1;
      })
      .addCase(sendMessageThunk.rejected, (state) => {
        state.loading = false;
        state.messages.push({
          id: state.nextId,
          text: "🚫 Error conectando con el servidor.",
          sender: "bot",
        });
        state.nextId += 1;
      })
      // Procesar respuesta de la foto
      .addCase(sendPhotoThunk.fulfilled, (state, action) => {
        state.loading = false;
        const items = action.payload;
        const formatted = `🍴 Alimento reconocido: ${items.name}\n📊 Información nutricional:\n- Calorías: ${items.calories} kcal\n- Proteínas: ${items.proteins.quantity} ${items.proteins.unit}\n- Carbohidratos: ${items.carbs.quantity} ${items.carbs.unit}\n- Grasas: ${items.fats.quantity} ${items.fats.unit}\n- Tamaño de porción: ${items.servingSize} g`;
        state.messages.push({
          id: state.nextId,
          text: formatted,
          sender: "bot",
        });
        state.nextId += 1;
      })
      .addCase(sendPhotoThunk.rejected, (state) => {
        state.loading = false;
        state.messages.push({
          id: state.nextId,
          text: "🚫 Error procesando la imagen.",
          sender: "bot",
        });
        state.nextId += 1;
      });
  },
});

export const { addMessage, setLoading, clearHistory } = chatSlice.actions;
export default chatSlice.reducer;
