import { UserResponseDto } from "@sergiomesasyelamos2000/shared";
import type { AuthTokensDto as AuthTokens } from "@sergiomesasyelamos2000/shared";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface AuthState {
  // State
  user: UserResponseDto | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  welcomeMessage: string | null;

  // Actions
  setAuth: (user: UserResponseDto, tokens: AuthTokens) => void;
  updateUser: (user: Partial<UserResponseDto>) => void;
  updateTokens: (tokens: AuthTokens) => void;
  clearAuth: () => void;
  setLoading: (isLoading: boolean) => void;
  setWelcomeMessage: (message: string | null) => void;
  clearWelcomeMessage: () => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      welcomeMessage: null,

      // Set authentication (login/register success)
      setAuth: (user: UserResponseDto, tokens: AuthTokens) => {
        set({
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken || null,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      // Update user profile
      updateUser: (userData: Partial<UserResponseDto>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData },
          });
        }
      },

      // Update tokens (refresh token flow)
      updateTokens: (tokens: AuthTokens) => {
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken || get().refreshToken,
        });
      },

      // Clear authentication state
      clearAuth: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          welcomeMessage: null,
        });
      },

      // Set loading state
      setLoading: (isLoading: boolean) => {
        set({ isLoading });
      },

      setWelcomeMessage: (message: string | null) => {
        set({ welcomeMessage: message });
      },

      clearWelcomeMessage: () => {
        set({ welcomeMessage: null });
      },

      // Logout (clear state and storage)
      logout: async () => {
        get().clearAuth();
        // AsyncStorage is cleared automatically by zustand persist
      },
    }),
    {
      name: "auth-storage", // AsyncStorage key
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist essential auth data
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Selectors for common use cases
export const selectIsAuthenticated = (state: AuthState) =>
  state.isAuthenticated;
export const selectUser = (state: AuthState) => state.user;
export const selectAccessToken = (state: AuthState) => state.accessToken;
export const selectUserId = (state: AuthState) => state.user?.id || null;
