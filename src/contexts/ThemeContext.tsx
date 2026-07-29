// contexts/ThemeContext.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";

export type ThemeMode = "light" | "dark" | "auto";

export interface Theme {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  onPrimary: string;

  background: string;
  backgroundSecondary: string;
  card: string;
  surface: string;
  surfaceElevated: string;

  text: string;
  textSecondary: string;
  textTertiary: string;

  border: string;
  divider: string;

  inputBackground: string;
  inputBorder: string;
  inputPlaceholder: string;

  success: string;
  error: string;
  warning: string;
  info: string;

  destructive: string;
  onDestructive: string;

  overlay: string;
  selection: string;

  shadowColor: string;

  tabBarBackground: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;
}

const lightTheme: Theme = {
  primary: "#6C3BAA",
  primaryLight: "#8B5CF6",
  primaryDark: "#5B2E91",
  onPrimary: "#FFFFFF",

  background: "#FFFFFF",
  backgroundSecondary: "#F8FAFC",
  card: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceElevated: "#FFFFFF",

  text: "#1E293B",
  textSecondary: "#64748B",
  textTertiary: "#94A3B8",

  border: "#E2E8F0",
  divider: "#F1F5F9",

  inputBackground: "#F8FAFC",
  inputBorder: "#E2E8F0",
  inputPlaceholder: "#94A3B8",

  success: "#10B981",
  error: "#EF4444",
  warning: "#F59E0B",
  info: "#3B82F6",

  destructive: "#DC2626",
  onDestructive: "#FFFFFF",

  overlay: "rgba(15, 23, 42, 0.45)",
  selection: "rgba(108, 59, 170, 0.12)",

  shadowColor: "#000000",

  tabBarBackground: "#FFFFFF",
  tabBarBorder: "#E2E8F0",
  tabBarActive: "#6C3BAA",
  tabBarInactive: "#94A3B8",
};

const darkTheme: Theme = {
  primary: "#A78BFA",
  primaryLight: "#C4B5FD",
  primaryDark: "#8B5CF6",
  onPrimary: "#0F172A",

  background: "#0B1220",
  backgroundSecondary: "#111827",
  card: "#1E293B",
  surface: "#1E293B",
  surfaceElevated: "#273549",

  text: "#F1F5F9",
  textSecondary: "#CBD5E1",
  textTertiary: "#94A3B8",

  border: "#334155",
  divider: "#1F2937",

  inputBackground: "#1E293B",
  inputBorder: "#475569",
  inputPlaceholder: "#94A3B8",

  success: "#34D399",
  error: "#F87171",
  warning: "#FBBF24",
  info: "#60A5FA",

  destructive: "#F87171",
  onDestructive: "#0F172A",

  overlay: "rgba(0, 0, 0, 0.65)",
  selection: "rgba(167, 139, 250, 0.22)",

  shadowColor: "#000000",

  tabBarBackground: "#1E293B",
  tabBarBorder: "#334155",
  tabBarActive: "#A78BFA",
  tabBarInactive: "#64748B",
};

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "themeMode";

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("auto");

  useEffect(() => {
    void loadThemeMode();
  }, []);

  const loadThemeMode = async () => {
    try {
      const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (
        savedMode === "light" ||
        savedMode === "dark" ||
        savedMode === "auto"
      ) {
        setThemeModeState(savedMode);
      }
      // No saved value → keep default "auto" (follow device)
    } catch (error) {
      console.error("Error loading theme mode:", error);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      setThemeModeState(mode);
    } catch (error) {
      console.error("Error saving theme mode:", error);
    }
  };

  const isDark =
    themeMode === "auto" ? systemColorScheme === "dark" : themeMode === "dark";

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};

export { lightTheme, darkTheme };
