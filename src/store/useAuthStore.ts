import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { AuthTokens, User } from "../models";

interface AuthState {
  // State
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setAuth: (user: User, tokens: AuthTokens) => void;
  updateUser: (user: Partial<User>) => void;
  updateTokens: (tokens: AuthTokens) => void;
  clearAuth: () => void;
  setLoading: (isLoading: boolean) => void;
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

      // Set authentication (login/register success)
      setAuth: (user: User, tokens: AuthTokens) => {
        set({
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken || null,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      // Update user profile
      updateUser: (userData: Partial<User>) => {
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
        console.warn("[AuthStore] Clearing auth state");
        console.trace("[AuthStore] clearAuth called from:");
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      // Set loading state
      setLoading: (isLoading: boolean) => {
        set({ isLoading });
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
