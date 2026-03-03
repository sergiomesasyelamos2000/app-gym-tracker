/**
 * RootNavigator - Handles authentication-based navigation
 *
 * Shows AuthScreen when user is not authenticated
 * Shows BottomTabs when user is authenticated
 * Includes SubscriptionStack as modal accessible from anywhere
 */

import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  StyleSheet,
  View,
} from "react-native";
import KeyboardDismissButton from "../components/KeyboardDismissButton";
import AuthScreen from "../features/login/screens/AuthScreen";
import ForgotPasswordScreen from "../features/login/screens/ForgotPasswordScreen";
import { prefetchExerciseCatalog } from "../services/exerciseService";
import { useAuthStore } from "../store/useAuthStore";
import { useSubscriptionStore } from "../store/useSubscriptionStore";

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const fetchSubscription = useSubscriptionStore(
    (state) => state.setSubscription
  );
  const [isInitializing, setIsInitializing] = useState(true);
  const hasWarmedUpCatalogRef = useRef(false);
  const MainAppComponent = useRef<React.ComponentType<any> | null>(null);
  const SubscriptionStackComponent = useRef<React.ComponentType<any> | null>(
    null
  );

  // Check if auth state is loaded from AsyncStorage
  useEffect(() => {
    // Small delay to ensure zustand persist has loaded state from AsyncStorage
    const timer = setTimeout(() => {
      const currentUser = useAuthStore.getState().user;
      const currentAuth = useAuthStore.getState().isAuthenticated;
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

  useEffect(() => {
    if (!isAuthenticated || isInitializing) {
      hasWarmedUpCatalogRef.current = false;
      return;
    }
    if (hasWarmedUpCatalogRef.current) return;
    hasWarmedUpCatalogRef.current = true;
    void prefetchExerciseCatalog({ force: true });
  }, [isAuthenticated, isInitializing]);

  useEffect(() => {
    if (!isAuthenticated || isInitializing) return;

    let previousState: AppStateStatus = AppState.currentState;
    const subscription = AppState.addEventListener("change", (nextState) => {
      const isReturningToForeground =
        (previousState === "background" || previousState === "inactive") &&
        nextState === "active";

      previousState = nextState;

      if (!isReturningToForeground) return;
      void prefetchExerciseCatalog({ force: true });
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, isInitializing]);

  // Show loading screen while checking auth state
  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C3BAA" />
      </View>
    );
  }

  if (isAuthenticated && !MainAppComponent.current) {
    MainAppComponent.current = require("./BottomTabs").BottomTabs;
  }

  if (isAuthenticated && !SubscriptionStackComponent.current) {
    SubscriptionStackComponent.current =
      require("../features/subscription/screens/SubscriptionStack")
        .SubscriptionStack;
  }

  // Show auth screen or main app with subscription stack
  return (
    <View style={styles.root}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen
              name="MainApp"
              component={MainAppComponent.current as React.ComponentType<any>}
            />
            <Stack.Screen
              name="SubscriptionStack"
              component={
                SubscriptionStackComponent.current as React.ComponentType<any>
              }
              options={{
                presentation: "modal",
                headerShown: false,
              }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Auth" component={AuthScreen} />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
              options={{ animation: "slide_from_right" }}
            />
          </>
        )}
      </Stack.Navigator>
      <KeyboardDismissButton />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
});
