import { NavigationContainer } from "@react-navigation/native";
import React, { useEffect } from "react";
import { LogBox, StatusBar } from "react-native";
import "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "./global.css";
import { RootNavigator } from "./src/navigation";

import "react-native-gesture-handler";
import Toast from "react-native-toast-message";

import * as Notifications from "expo-notifications";
import { notificationService } from "./src/services/notificationService";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Provider as PaperProvider } from "react-native-paper";
import { ToastConfigParams } from "react-native-toast-message";
import { ThemeProvider, useTheme } from "./src/contexts/ThemeContext";
import { useNotificationSettingsStore } from "./src/store/useNotificationSettingsStore";
import CustomToast from "./src/ui/CustomToast";
import { SyncProvider } from "./src/components/SyncProvider";

LogBox.ignoreLogs([
  "expo-notifications: Android Push notifications",
  "expo-notifications functionality is not fully supported",
  "[Reanimated] Reduced motion setting is enabled",
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

function AppContent() {
  const { isDark } = useTheme();

  // Initialize notification listeners
  useEffect(() => {
    const setupNotifications = async () => {
      // Register for push notifications
      const token =
        await notificationService.registerForPushNotificationsAsync();
      const setPermissionsGranted =
        useNotificationSettingsStore.getState().setPermissionsGranted;

      if (token) {
        console.log("Push Token obtained:", token);
        setPermissionsGranted(true);
        // TODO: Send token to backend when user is logged in
      } else {
        setPermissionsGranted(false);
      }

      // Check if app was opened from a notification (cold start)
      const lastNotificationResponse =
        await Notifications.getLastNotificationResponseAsync();
      if (lastNotificationResponse) {
        console.log(
          "App opened via notification (cold start):",
          lastNotificationResponse,
        );
        // Handle deep linking logic here if needed
      }
    };

    setupNotifications();

    // Listener for notifications received while app is in foreground
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("Notification received in foreground:", notification);
      },
    );

    // Listener for when user taps on a notification
    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("Notification response received:", response);
        // You can add navigation logic here if needed
      });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
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
      <PaperProvider>
        <SafeAreaProvider>
          <SyncProvider>
            <AppContent />
          </SyncProvider>
        </SafeAreaProvider>
      </PaperProvider>
    </ThemeProvider>
  );
}
