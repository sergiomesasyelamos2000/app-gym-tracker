import { create } from 'zustand';
import type { ChatMessageDto } from "@sergiomesasyelamos2000/shared";
import {
  postPhoto,
  postText,
} from '../features/nutrition/services/nutritionService';

// Tipos
export interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  imageUri?: string;
}

interface UserChatData {
  messages: Message[];
  nextId: number;
}

interface ChatState {
  // Estado - separado por usuario (SIN PERSISTENCIA)
  userChats: Record<string, UserChatData>;
  currentUserId: string | null;
  loading: boolean;

  // Acciones síncronas
  addMessage: (message: Omit<Message, 'id'>, userId: string) => void;
  setLoading: (loading: boolean) => void;
  setCurrentUser: (userId: string) => void;
  clearHistory: (userId: string) => void;

  // Acciones asíncronas
  sendMessage: (text: string, userId: string) => Promise<void>;
  sendPhoto: (fileData: FormData, userId: string) => Promise<void>;

  // Utilidades
  reset: () => void;
}

// Mensaje de bienvenida
const getWelcomeMessage = (nextId: number): Message => ({
  id: nextId,
  text: '¡Hola! Soy tu asistente de nutrición. ¿Cómo puedo ayudarte hoy?',
  sender: 'bot',
});

// Estado inicial por usuario
const getInitialUserData = (): UserChatData => ({
  messages: [getWelcomeMessage(1)],
  nextId: 2,
});

// Estado inicial global
const initialState = {
  userChats: {},
  currentUserId: null,
  loading: false,
};

// Store SIN PERSIST (sin sincronización offline)
export const useChatStore = create<ChatState>((set, get) => ({
  ...initialState,

  // Acciones síncronas
  setCurrentUser: (userId: string) => {
    set({ currentUserId: userId });

    // Si no existe data para este usuario, inicializarla
    const { userChats } = get();
    if (!userChats[userId]) {
      set({
        userChats: {
          ...userChats,
          [userId]: getInitialUserData(),
        },
      });
    }
  },

  addMessage: (message: Omit<Message, 'id'>, userId: string) => {
    set((state) => {
      const userData = state.userChats[userId] || getInitialUserData();
      return {
        userChats: {
          ...state.userChats,
          [userId]: {
            messages: [
              ...userData.messages,
              {
                ...message,
                id: userData.nextId,
              },
            ],
            nextId: userData.nextId + 1,
          },
        },
      };
    });
  },

  setLoading: (loading: boolean) => {
    set({ loading });
  },

  clearHistory: (userId: string) => {
    set((state) => ({
      userChats: {
        ...state.userChats,
        [userId]: getInitialUserData(),
      },
    }));
  },

  // Acciones asíncronas
  sendMessage: async (text: string, userId: string) => {
    if (!userId) {
      console.error('Cannot send message without userId');
      return;
    }

    const { userChats } = get();
    const userData = userChats[userId] || getInitialUserData();

    // Construir historial de mensajes del usuario actual
    const history: ChatMessageDto[] = userData.messages.map((msg) => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text,
    }));

    set({ loading: true });

    try {
      const data = await postText(text, history, userId);
      set({ loading: false });

      // Agregar respuesta del bot
      const currentUserData = get().userChats[userId];
      const newNextId = currentUserData.nextId;

      set((state) => ({
        userChats: {
          ...state.userChats,
          [userId]: {
            messages: [
              ...currentUserData.messages,
              {
                id: newNextId,
                text: data.reply,
                sender: 'bot',
              },
            ],
            nextId: newNextId + 1,
          },
        },
      }));
    } catch (error) {
      console.error('Error sending message:', error);
      set({ loading: false });

      // Agregar mensaje de error
      const currentUserData = get().userChats[userId];
      const newNextId = currentUserData.nextId;

      set((state) => ({
        userChats: {
          ...state.userChats,
          [userId]: {
            messages: [
              ...currentUserData.messages,
              {
                id: newNextId,
                text: '🚫 Error conectando con el servidor.',
                sender: 'bot',
              },
            ],
            nextId: newNextId + 1,
          },
        },
      }));
    }
  },

  sendPhoto: async (fileData: FormData, userId: string) => {
    if (!userId) {
      console.error('Cannot send photo without userId');
      return;
    }

    set({ loading: true });

    try {
      const data = await postPhoto(fileData);
      set({ loading: false });

      let formatted = 'No se pudo reconocer ningún alimento.';

      if (data && data.length > 0) {
        formatted = data
          .map((item) => {
            return `🍴 Alimento reconocido: ${item.name}\n📊 Información nutricional:\n- Calorías: ${item.calories || 0} kcal\n- Proteínas: ${item.proteins || 0} g\n- Carbohidratos: ${item.carbs || 0} g\n- Grasas: ${item.fats || 0} g\n- Tamaño de porción: ${item.servingSize || 0} g`;
          })
          .join('\n\n');
      }

      const currentUserData = get().userChats[userId];
      const newNextId = currentUserData.nextId;

      set((state) => ({
        userChats: {
          ...state.userChats,
          [userId]: {
            messages: [
              ...currentUserData.messages,
              {
                id: newNextId,
                text: formatted,
                sender: 'bot',
              },
            ],
            nextId: newNextId + 1,
          },
        },
      }));
    } catch (error) {
      console.error('Error sending photo:', error);
      set({ loading: false });

      const currentUserData = get().userChats[userId];
      const newNextId = currentUserData.nextId;

      set((state) => ({
        userChats: {
          ...state.userChats,
          [userId]: {
            messages: [
              ...currentUserData.messages,
              {
                id: newNextId,
                text: '🚫 Error procesando la imagen.',
                sender: 'bot',
              },
            ],
            nextId: newNextId + 1,
          },
        },
      }));
    }
  },

  reset: () => {
    set(initialState);
  },
}));

// Selectores con shallow compare para evitar loops
// Retornan valores primitivos o referencias estables
export const selectMessages = (state: ChatState): Message[] => {
  const { userChats, currentUserId } = state;
  if (!currentUserId || !userChats[currentUserId]) {
    return [];
  }
  return userChats[currentUserId].messages;
};

export const selectLoading = (state: ChatState): boolean => state.loading;

export const selectCurrentUserId = (state: ChatState): string | null => state.currentUserId;

// Para usar en componentes sin loops, usar este hook personalizado
export const useMessages = () => {
  const currentUserId = useChatStore((state) => state.currentUserId);
  const userChats = useChatStore((state) => state.userChats);

  // Referencia estable: solo cambia cuando cambian los mensajes del usuario actual
  if (!currentUserId || !userChats[currentUserId]) {
    return [];
  }
  return userChats[currentUserId].messages;
};
