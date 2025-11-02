import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar, ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Provider as PaperProvider } from "react-native-paper";
import { Provider as ReduxProvider } from "react-redux";
import Toast, { ToastConfigParams } from "react-native-toast-message";

import "./global.css";
import { store } from "./src/store/store";
import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import HomeScreen from "./src/screens/HomeScreen";
import CustomToast from "./src/ui/CustomToast";
import LoginScreen from "./src/features/login/screens/LoginScreen";

const Stack = createNativeStackNavigator();

// Configuración del Toast personalizado
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

// Componente que maneja la navegación condicional según el estado de autenticación
function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#4285F4" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Home" component={HomeScreen} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// App principal con todos los proveedores integrados
export default function App() {
  return (
    <ReduxProvider store={store}>
      <PaperProvider>
        <SafeAreaProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <AuthProvider>
              <StatusBar barStyle="dark-content" />
              <AppNavigator />
              <Toast config={toastConfig} />
            </AuthProvider>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </PaperProvider>
    </ReduxProvider>
  );
}
