// contexts/ThemeContext.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";

type ThemeMode = "light" | "dark" | "auto";

export interface Theme {
  // Colores base
  primary: string;
  primaryLight: string;
  primaryDark: string;

  // Backgrounds
  background: string;
  backgroundSecondary: string;
  card: string;

  // Textos
  text: string;
  textSecondary: string;
  textTertiary: string;

  // Borders y dividers
  border: string;
  divider: string;

  // Inputs
  inputBackground: string;
  inputBorder: string;

  // Estados
  success: string;
  error: string;
  warning: string;
  info: string;

  // Shadows
  shadowColor: string;

  // Tab bar
  tabBarBackground: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;
}

const lightTheme: Theme = {
  primary: "#6C3BAA",
  primaryLight: "#8B5CF6",
  primaryDark: "#5B2E91",

  background: "#FFFFFF",
  backgroundSecondary: "#F8FAFC",
  card: "#FFFFFF",

  text: "#1E293B",
  textSecondary: "#64748B",
  textTertiary: "#94A3B8",

  border: "#E2E8F0",
  divider: "#F1F5F9",

  inputBackground: "#F8FAFC",
  inputBorder: "#E2E8F0",

  success: "#10B981",
  error: "#EF4444",
  warning: "#F59E0B",
  info: "#3B82F6",

  shadowColor: "#000000",

  tabBarBackground: "#FFFFFF",
  tabBarBorder: "#E2E8F0",
  tabBarActive: "#6C3BAA",
  tabBarInactive: "#94A3B8",
};

const darkTheme: Theme = {
  primary: "#8B5CF6",
  primaryLight: "#A78BFA",
  primaryDark: "#7C3AED",

  background: "#0F172A",
  backgroundSecondary: "#1E293B",
  card: "#1E293B",

  text: "#F1F5F9",
  textSecondary: "#CBD5E1",
  textTertiary: "#94A3B8",

  border: "#334155",
  divider: "#1E293B",

  inputBackground: "#1E293B",
  inputBorder: "#334155",

  success: "#10B981",
  error: "#EF4444",
  warning: "#F59E0B",
  info: "#3B82F6",

  shadowColor: "#000000",

  tabBarBackground: "#1E293B",
  tabBarBorder: "#334155",
  tabBarActive: "#8B5CF6",
  tabBarInactive: "#64748B",
};

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("auto");

  useEffect(() => {
    loadThemeMode();
  }, []);

  const loadThemeMode = async () => {
    try {
      const savedMode = await AsyncStorage.getItem("themeMode");
      if (savedMode) {
        setThemeModeState(savedMode as ThemeMode);
      }
    } catch (error) {
      console.error("Error loading theme mode:", error);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem("themeMode", mode);
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
