/**
 * RootNavigator - Handles authentication-based navigation
 *
 * Shows AuthScreen when user is not authenticated
 * Shows BottomTabs when user is authenticated
 * Includes SubscriptionStack as modal accessible from anywhere
 */

import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AuthScreen from "../features/login/screens/AuthScreen";
import { useAuthStore } from "../store/useAuthStore";
import { useSubscriptionStore } from "../store/useSubscriptionStore";
import { BottomTabs } from "./BottomTabs";
import { SubscriptionStack } from "../features/subscription/screens/SubscriptionStack";

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const fetchSubscription = useSubscriptionStore((state) => state.setSubscription);
  const [isInitializing, setIsInitializing] = useState(true);

  // Check if auth state is loaded from AsyncStorage
  useEffect(() => {
    // Small delay to ensure zustand persist has loaded state from AsyncStorage
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Load subscription data when authenticated
  useEffect(() => {
    if (isAuthenticated && !isInitializing) {
      // Subscription will be loaded by useSubscription hook in components
    }
  }, [isAuthenticated, isInitializing]);

  // Show loading screen while checking auth state
  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C3BAA" />
      </View>
    );
  }

  // Show auth screen or main app with subscription stack
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="MainApp" component={BottomTabs} />
          <Stack.Screen
            name="SubscriptionStack"
            component={SubscriptionStack}
            options={{
              presentation: "modal",
              headerShown: false,
            }}
          />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthScreen} />
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
});
