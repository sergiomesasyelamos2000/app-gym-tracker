import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'auto';

export interface Theme {
  // Background colors
  background: string;
  backgroundSecondary: string;
  card: string;

  // Text colors
  text: string;
  textSecondary: string;
  textTertiary: string;

  // Primary color
  primary: string;
  primaryDark: string;
  primaryLight: string;

  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;

  // UI elements
  border: string;
  divider: string;
  shadow: string;

  // Input elements
  inputBackground: string;
  inputBorder: string;
  placeholder: string;
}

const lightTheme: Theme = {
  background: '#FFFFFF',
  backgroundSecondary: '#F8FAFC',
  card: '#FFFFFF',

  text: '#1A1A1A',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',

  primary: '#6C3BAA',
  primaryDark: '#5A2F91',
  primaryLight: '#9F7AC9',

  success: '#4CAF50',
  warning: '#FF9800',
  error: '#FF6B6B',
  info: '#2196F3',

  border: '#E5E7EB',
  divider: '#F3F4F6',
  shadow: '#000000',

  inputBackground: '#FFFFFF',
  inputBorder: '#E5E7EB',
  placeholder: '#9CA3AF',
};

const darkTheme: Theme = {
  background: '#121212',
  backgroundSecondary: '#1E1E1E',
  card: '#1E1E1E',

  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textTertiary: '#808080',

  primary: '#9F7AC9',
  primaryDark: '#8B5FC7',
  primaryLight: '#B794D9',

  success: '#66BB6A',
  warning: '#FFA726',
  error: '#EF5350',
  info: '#42A5F5',

  border: '#2C2C2C',
  divider: '#242424',
  shadow: '#000000',

  inputBackground: '#2C2C2C',
  inputBorder: '#3C3C3C',
  placeholder: '#666666',
};

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@app_theme_mode';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('auto');

  // Determine actual theme based on mode
  const isDark = themeMode === 'auto'
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const theme = isDark ? darkTheme : lightTheme;

  // Load saved theme mode on mount
  useEffect(() => {
    loadThemeMode();
  }, []);

  const loadThemeMode = async () => {
    try {
      const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedMode && (savedMode === 'light' || savedMode === 'dark' || savedMode === 'auto')) {
        setThemeModeState(savedMode as ThemeMode);
      }
    } catch (error) {
      console.error('Error loading theme mode:', error);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      setThemeModeState(mode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.error('Error saving theme mode:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
