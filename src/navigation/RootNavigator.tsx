/**
 * RootNavigator - Handles authentication-based navigation
 *
 * Shows AuthScreen when user is not authenticated
 * Shows BottomTabs when user is authenticated
 */

import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useAuthStore } from "../store/useAuthStore";
import AuthScreen from "../features/login/screens/AuthScreen";
import { BottomTabs } from "./BottomTabs";

export const RootNavigator = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [isInitializing, setIsInitializing] = useState(true);

  // Check if auth state is loaded from AsyncStorage
  useEffect(() => {
    // Small delay to ensure zustand persist has loaded state from AsyncStorage
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Show loading screen while checking auth state
  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C3BAA" />
      </View>
    );
  }

  // Show auth screen or main app based on authentication
  return isAuthenticated ? <BottomTabs /> : <AuthScreen />;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
});
