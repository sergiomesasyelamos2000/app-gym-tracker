import { NavigationContainer } from "@react-navigation/native";
import React from "react";
import { StatusBar } from "react-native";
import "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "./global.css";
import { RootNavigator } from "./src/navigation";

import "react-native-gesture-handler";
import Toast from "react-native-toast-message";

import { Provider as PaperProvider } from "react-native-paper";
import { ToastConfigParams } from "react-native-toast-message";
import { Provider as ReduxProvider } from "react-redux";
import { store } from "./src/store/store";
import CustomToast from "./src/ui/CustomToast";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider, useTheme } from "./src/contexts/ThemeContext";

const toastConfig = {
  customToast: ({ text1, props }: ToastConfigParams<any>) => (
    <CustomToast
      text1={text1 ?? ""}
      progress={props?.progress}
      onCancel={props?.onCancel}
      onAddTime={props?.onAddTime}
      onSubtractTime={props?.onSubtractTime}
    />
  ),
};

function AppContent() {
  const { isDark, theme } = useTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer
        theme={{
          dark: isDark,
          colors: {
            primary: theme.primary,
            background: theme.background,
            card: theme.card,
            text: theme.text,
            border: theme.border,
            notification: theme.error,
          },
        }}
      >
        <StatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          backgroundColor={theme.background}
        />
        <RootNavigator />
      </NavigationContainer>
      <Toast config={toastConfig} />
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <ReduxProvider store={store}>
      <ThemeProvider>
        <PaperProvider>
          <SafeAreaProvider>
            <AppContent />
          </SafeAreaProvider>
        </PaperProvider>
      </ThemeProvider>
    </ReduxProvider>
  );
}
