import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { apiFetch } from "../../../api"; // Ajusta la ruta según tu estructura
import { useTheme } from "../../../contexts/ThemeContext";

// Es necesario para completar la sesión de autenticación en web
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingType, setLoadingType] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // 1. Configura la solicitud de autenticación con Google :cite[4]:cite[8]
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId:
      "1019156813901-996dkn9dvnedm2bb7k2huapr3lsb98rt.apps.googleusercontent.com",
    androidClientId: "TU_ANDROID_CLIENT_ID.apps.googleusercontent.com",
    webClientId:
      "1019156813901-qsa5kq5sv3gvf20p76bnu074h2l3us7u.apps.googleusercontent.com",
    scopes: ["profile", "email"],
  });

  useEffect(() => {
    const redirectUri = AuthSession.makeRedirectUri({
      scheme: "app", // This should match the "scheme" in your app.json
    });
  }, []);

  // Animaciones de entrada
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // 2. Maneja la respuesta de autenticación de Google :cite[4]
  useEffect(() => {
    if (response?.type === "success") {
      handleGoogleAuthSuccess(response.authentication);
    }
  }, [response]);

  const handleGoogleAuthSuccess = async (authentication: any) => {
    setIsLoading(true);
    try {
      // 1. Obtener información del perfil del usuario
      const userInfoResponse = await fetch(
        "https://www.googleapis.com/userinfo/v2/me",
        {
          headers: { Authorization: `Bearer ${authentication.accessToken}` },
        }
      );
      const userInfo = await userInfoResponse.json();

      // 2. Enviar token e información a TU backend
      const backendData = await apiFetch("auth/google/callback", {
        method: "POST",
        body: JSON.stringify({
          accessToken: authentication.accessToken,
          userInfo: userInfo,
        }),
      });

      // 3. Manejar la respuesta de tu backend (ej. guardar token, navegar a pantalla principal)
      Alert.alert("¡Bienvenido!", `Hola ${userInfo.name}`);
    } catch (error) {
      console.error("Error en la autenticación:", error);
      Alert.alert("Error", "No se pudo completar el inicio de sesión.");
    } finally {
      setIsLoading(false);
    }
  };

  const getUserInfo = async (token: any) => {
    const response = await fetch("https://www.googleapis.com/userinfo/v2/me", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(
        `Error al obtener información del usuario: ${response.status}`
      );
    }

    return await response.json();
  };

  const loginWithGoogle = () => {
    promptAsync();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header Section */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>FitTrack 💪</Text>
            <Text style={styles.headerSubtitle}>
              Tu compañero de entrenamiento personal
            </Text>
          </View>

          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>🔥</Text>
            </View>
          </View>
        </Animated.View>

        {/* Login Section */}
        <Animated.View
          style={[
            styles.loginSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>¡Bienvenido!</Text>
            <Text style={styles.welcomeSubtitle}>
              Inicia sesión para comenzar tu journey fitness
            </Text>
          </View>

          {/* Login Buttons */}
          <View style={styles.buttonsContainer}>
            {/* Google Login Button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                styles.googleButton,
                (isLoading || !request) && styles.buttonDisabled,
              ]}
              onPress={loginWithGoogle}
              disabled={isLoading || !request}
            >
              <View style={styles.buttonContent}>
                <View
                  style={[styles.iconContainer, styles.googleIconContainer]}
                >
                  <Text style={styles.buttonIcon}>G</Text>
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.buttonText}>
                    {isLoading && loadingType === "google"
                      ? "Conectando..."
                      : "Continuar con Google"}
                  </Text>
                  <Text style={styles.buttonSubtext}>
                    Inicia sesión rápidamente
                  </Text>
                </View>
                {!isLoading ? (
                  <Text style={styles.arrow}>→</Text>
                ) : (
                  <ActivityIndicator size="small" color="#6C3BAA" />
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Al continuar, aceptas nuestros{" "}
              <Text style={styles.footerLink}>Términos de servicio</Text> y{" "}
              <Text style={styles.footerLink}>Política de privacidad</Text>
            </Text>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

// Tus estilos se mantienen igual. Asegúrate de que están definidos.
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  container: {
    flex: 1,
  },
  // ... (Tus estilos existentes para header, logo, loginSection, etc.)
  header: {
    backgroundColor: "#6C3BAA",
    paddingHorizontal: 30,
    paddingTop: 60,
    paddingBottom: 40,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    shadowColor: "#6C3BAA",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  headerContent: {
    alignItems: "center",
    marginBottom: 30,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  headerSubtitle: {
    color: "#E0D7F5",
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "500",
    textAlign: "center",
    opacity: 0.9,
  },
  logoContainer: {
    alignItems: "center",
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  logoText: {
    fontSize: 36,
  },
  loginSection: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 40,
  },
  welcomeSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 8,
    textAlign: "center",
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
  },
  buttonsContainer: {
    gap: 16,
    marginBottom: 40,
  },
  loginButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderLeftWidth: 4,
  },
  googleButton: {
    borderLeftColor: "#4285F4",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  googleIconContainer: {
    backgroundColor: "#4285F4",
  },
  buttonIcon: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  textContainer: {
    flex: 1,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 4,
  },
  buttonSubtext: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  arrow: {
    fontSize: 20,
    color: "#6C3BAA",
    fontWeight: "bold",
  },
  footer: {
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
  },
  footerLink: {
    color: "#6C3BAA",
    fontWeight: "600",
  },
});
