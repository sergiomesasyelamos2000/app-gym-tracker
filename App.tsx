import {
  DarkTheme as NavDarkTheme,
  DefaultTheme as NavDefaultTheme,
  NavigationContainer,
  Theme as NavigationTheme,
} from "@react-navigation/native";
import Constants from "expo-constants";
import React, { useEffect, useMemo } from "react";
import { LogBox, Platform, StatusBar, TextInput } from "react-native";
import "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "./global.css";
import { RootNavigator } from "./src/navigation";

import "react-native-gesture-handler";
import Toast from "react-native-toast-message";
import { notificationService } from "./src/services/notificationService";
import {
  isRestCompleteNotification,
  playRestCompleteFeedback,
} from "./src/services/restTimerFeedback";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  MD3DarkTheme,
  MD3LightTheme,
  Provider as PaperProvider,
} from "react-native-paper";
import { ToastConfigParams } from "react-native-toast-message";
import { ThemeProvider, useTheme, type Theme } from "./src/contexts/ThemeContext";
import { useNotificationSettingsStore } from "./src/store/useNotificationSettingsStore";
import CustomToast from "./src/ui/CustomToast";
import { SyncProvider } from "./src/components/SyncProvider";
import { GLOBAL_KEYBOARD_ACCESSORY_ID } from "./src/components/KeyboardDismissButton";

const isExpoGoAndroid =
  Platform.OS === "android" && Constants.appOwnership === "expo";
const Notifications: any =
  !isExpoGoAndroid
    ? (() => {
        try {
          return require("expo-notifications");
        } catch {
          return null;
        }
      })()
    : null;

LogBox.ignoreLogs([
  "expo-notifications: Android Push notifications",
  "expo-notifications functionality is not fully supported",
  "[Reanimated] Reduced motion setting is enabled",
  "Default FirebaseApp is not initialized",
  "fcm-credentials",
]);

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

function buildNavigationTheme(theme: Theme, isDark: boolean): NavigationTheme {
  const base = isDark ? NavDarkTheme : NavDefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: theme.primary,
      background: theme.background,
      card: theme.card,
      text: theme.text,
      border: theme.border,
      notification: theme.error,
    },
  };
}

function buildPaperTheme(theme: Theme, isDark: boolean) {
  const base = isDark ? MD3DarkTheme : MD3LightTheme;
  return {
    ...base,
    dark: isDark,
    colors: {
      ...base.colors,
      primary: theme.primary,
      primaryContainer: theme.primaryLight,
      secondary: theme.primaryDark,
      background: theme.background,
      surface: theme.surface,
      surfaceVariant: theme.backgroundSecondary,
      onPrimary: theme.onPrimary,
      onSurface: theme.text,
      onBackground: theme.text,
      onSurfaceVariant: theme.textSecondary,
      outline: theme.border,
      error: theme.error,
      elevation: {
        ...base.colors.elevation,
        level0: theme.background,
        level1: theme.card,
        level2: theme.surfaceElevated,
        level3: theme.surfaceElevated,
        level4: theme.surfaceElevated,
        level5: theme.surfaceElevated,
      },
    },
  };
}

function ThemedProviders({ children }: { children: React.ReactNode }) {
  const { theme, isDark } = useTheme();
  const paperTheme = useMemo(
    () => buildPaperTheme(theme, isDark),
    [theme, isDark]
  );

  return <PaperProvider theme={paperTheme}>{children}</PaperProvider>;
}

function AppContent() {
  const { theme, isDark } = useTheme();
  const navigationTheme = useMemo(
    () => buildNavigationTheme(theme, isDark),
    [theme, isDark]
  );

  useEffect(() => {
    if (Platform.OS !== "ios") return;

    const TextInputAny = TextInput as unknown as {
      defaultProps?: Record<string, unknown>;
    };

    TextInputAny.defaultProps = {
      ...TextInputAny.defaultProps,
      inputAccessoryViewID:
        (TextInputAny.defaultProps?.inputAccessoryViewID as
          | string
          | undefined) ?? GLOBAL_KEYBOARD_ACCESSORY_ID,
      keyboardAppearance: isDark ? "dark" : "light",
    };
  }, [isDark]);

  useEffect(() => {
    if (!Notifications) {
      useNotificationSettingsStore.getState().setPermissionsGranted(false);
      return;
    }

    const setupNotifications = async () => {
      const setPermissionsGranted =
        useNotificationSettingsStore.getState().setPermissionsGranted;

      const hasPermissions = await notificationService.requestPermissions();
      setPermissionsGranted(hasPermissions);

      await notificationService.registerForPushNotificationsAsync();

      const lastNotificationResponse =
        await Notifications.getLastNotificationResponseAsync();
      if (lastNotificationResponse) {
        // Handle deep linking logic here if needed
      }
    };

    setupNotifications();

    const notificationListener = Notifications?.addNotificationReceivedListener(
      (notification: any) => {
        const data = notification?.request?.content?.data;
        if (isRestCompleteNotification(data)) {
          void playRestCompleteFeedback();
        }
      }
    );

    const responseListener =
      Notifications?.addNotificationResponseReceivedListener((response: any) => {
        console.log("Notification response received:", response);
      });

    return () => {
      notificationListener?.remove?.();
      responseListener?.remove?.();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer theme={navigationTheme}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <RootNavigator />
      </NavigationContainer>
      <Toast config={toastConfig} />
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ThemedProviders>
        <SafeAreaProvider>
          <SyncProvider>
            <AppContent />
          </SyncProvider>
        </SafeAreaProvider>
      </ThemedProviders>
    </ThemeProvider>
  );
}
