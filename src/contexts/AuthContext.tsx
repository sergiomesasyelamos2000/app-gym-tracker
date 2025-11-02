import React, { createContext, useState, useEffect, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
import { Platform } from "react-native";
import api from "../api/api";
import * as Linking from "expo-linking";

WebBrowser.maybeCompleteAuthSession();

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  picture: string;
}

interface AuthContextData {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const googleWebClientId = Constants.expoConfig?.extra?.googleWebClientId;
  const googleIosClientId = Constants.expoConfig?.extra?.googleIosClientId;
  const googleAndroidClientId =
    Constants.expoConfig?.extra?.googleAndroidClientId;

  // Seleccionar el Client ID según la plataforma
  const clientId = Platform.select({
    ios: googleIosClientId,
    android: googleAndroidClientId,
    default: googleWebClientId,
  });

  console.log("🔑 Client ID seleccionado:", clientId);
  console.log("🖥️ Platform:", Platform.OS);

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: clientId,
    // NO especificar iosClientId ni androidClientId aquí
    // NO especificar redirectUri
  });

  console.log("🔗 Redirect URI generada:", request?.redirectUri);

  useEffect(() => {
    checkStoredToken();
  }, []);

  useEffect(() => {
    if (response?.type === "success") {
      console.log("✅ Autenticación exitosa con Google");
      const { authentication } = response;
      console.log("🎫 ID Token recibido");
      handleGoogleSignIn(authentication?.idToken);
    } else if (response?.type === "error") {
      console.error("❌ Error en autenticación:", response.error);
      console.error("❌ Error params:", response.params);
    } else if (response?.type === "cancel") {
      console.log("⚠️ Autenticación cancelada por el usuario");
    }
  }, [response]);

  const checkStoredToken = async () => {
    try {
      const token = await AsyncStorage.getItem("access_token");
      const userStr = await AsyncStorage.getItem("user");

      if (token && userStr) {
        console.log("🔍 Verificando token almacenado...");

        const result = await api.post(
          "/auth/verify",
          { token },
          { auth: false }
        );

        if (result.statusCode === 200) {
          console.log("✅ Token válido, usuario autenticado");
          setUser(JSON.parse(userStr));
        } else {
          console.log("⚠️ Token inválido, limpiando storage");
          await AsyncStorage.removeItem("access_token");
          await AsyncStorage.removeItem("user");
        }
      } else {
        console.log("ℹ️ No hay token almacenado");
      }
    } catch (error) {
      console.error("❌ Error checking stored token:", error);
      await AsyncStorage.removeItem("access_token");
      await AsyncStorage.removeItem("user");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async (idToken: string | undefined) => {
    if (!idToken) {
      console.error("❌ No ID token received");
      return;
    }

    try {
      setLoading(true);
      console.log("📤 Enviando ID token al backend...");

      const response = await api.post(
        "/auth/google/mobile",
        { idToken },
        { auth: false }
      );

      console.log("📥 Respuesta del backend:", response);

      if (response.statusCode === 200) {
        const { access_token, user } = response.data;

        console.log("✅ Usuario autenticado:", user.email);

        await AsyncStorage.setItem("access_token", access_token);
        await AsyncStorage.setItem("user", JSON.stringify(user));

        setUser(user);
      } else {
        console.error("❌ Authentication failed:", response.message);
      }
    } catch (error) {
      console.error("❌ Error during Google sign in:", error);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      const apiUrl = Constants.expoConfig?.extra?.apiUrl.replace("/api", "");
      const authUrl = `${apiUrl}/api/auth/google/mobile-init`;

      console.log("🚀 Abriendo URL:", authUrl);

      // Abrir el navegador
      await WebBrowser.openAuthSessionAsync(authUrl, "app://");
    } catch (error) {
      console.error("❌ Error:", error);
    }
  };

  // Escuchar el deep link cuando vuelve
  useEffect(() => {
    const subscription = Linking.addEventListener("url", async ({ url }) => {
      console.log("🔗 Deep link recibido:", url);

      if (url.startsWith("app://auth")) {
        const params = new URL(url).searchParams;
        const token = params.get("token");

        if (token) {
          // Verificar y guardar el token
          const result = await api.post(
            "/auth/verify",
            { token },
            { auth: false }
          );

          if (result.statusCode === 200) {
            await AsyncStorage.setItem("access_token", token);
            await AsyncStorage.setItem(
              "user",
              JSON.stringify(result.data.user)
            );
            setUser(result.data.user);
          }
        }
      }
    });

    return () => subscription.remove();
  }, []);

  const signOut = async () => {
    try {
      setLoading(true);
      console.log("👋 Cerrando sesión...");
      await AsyncStorage.removeItem("access_token");
      await AsyncStorage.removeItem("user");
      setUser(null);
      console.log("✅ Sesión cerrada correctamente");
    } catch (error) {
      console.error("❌ Error signing out:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        signOut,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};
