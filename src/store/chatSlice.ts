import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { postPhoto, postText } from "../services/nutritionService";

export interface Message {
  id: number;
  text: string;
  sender: "user" | "bot";
  imageUri?: string;
}
interface ChatState {
  messages: Message[];
  loading: boolean;
}

const initialState: ChatState = {
  messages: [
    {
      id: 1,
      text: "¡Hola! Soy tu asistente de nutrición. ¿Cómo puedo ayudarte hoy?",
      sender: "bot",
    },
  ],
  loading: false,
};

// Thunk para envío de mensaje de texto
export const sendMessageThunk = createAsyncThunk(
  "chat/sendMessage",
  async (text: string, thunkAPI) => {
    const data = await postText(text);
    return data.items;
  }
);

// Thunk para envío de imagen
export const sendPhotoThunk = createAsyncThunk(
  "chat/sendPhoto",
  async (fileData: FormData, thunkAPI) => {
    const data = await postPhoto(fileData);
    return data.items;
  }
);

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendMessageThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(sendMessageThunk.fulfilled, (state, action) => {
        state.loading = false;
        // Agregar respuesta del bot
        state.messages.push({
          id: Date.now(),
          text: action.payload,
          sender: "bot",
        });
      })
      .addCase(sendMessageThunk.rejected, (state) => {
        state.loading = false;
        state.messages.push({
          id: Date.now(),
          text: "🚫 Error conectando con el servidor.",
          sender: "bot",
        });
      })
      // Procesar respuesta de la foto
      .addCase(sendPhotoThunk.fulfilled, (state, action) => {
        state.loading = false;
        const items = action.payload;
        const formatted = `🍴 Alimento reconocido: ${items.name}\n📊 Información nutricional:\n- Calorías: ${items.calories} kcal\n- Proteínas: ${items.proteins.quantity} ${items.proteins.unit}\n- Carbohidratos: ${items.carbs.quantity} ${items.carbs.unit}\n- Grasas: ${items.fats.quantity} ${items.fats.unit}\n- Tamaño de porción: ${items.servingSize} g`;
        state.messages.push({
          id: Date.now(),
          text: formatted,
          sender: "bot",
        });
      })
      .addCase(sendPhotoThunk.rejected, (state) => {
        state.loading = false;
        state.messages.push({
          id: Date.now(),
          text: "🚫 Error procesando la imagen.",
          sender: "bot",
        });
      });
  },
});

export const { addMessage, setLoading } = chatSlice.actions;
export default chatSlice.reducer;
