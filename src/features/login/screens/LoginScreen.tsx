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
import { apiFetch } from "../../../api";
import { useTheme } from "../../../contexts/ThemeContext";

// Es necesario para completar la sesión de autenticación en web
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { theme, isDark } = useTheme();
  const [isLoading, setIsLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Configura la solicitud de autenticación con Google
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
      scheme: "app",
    });
  }, []);

  // Animaciones de entrada
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Maneja la respuesta de autenticación de Google
  useEffect(() => {
    if (response?.type === "success") {
      handleGoogleAuthSuccess(response.authentication);
    }
  }, [response]);

  const handleGoogleAuthSuccess = async (authentication: any) => {
    setIsLoading(true);
    try {
      // Obtener información del perfil del usuario
      const userInfoResponse = await fetch(
        "https://www.googleapis.com/userinfo/v2/me",
        {
          headers: { Authorization: `Bearer ${authentication.accessToken}` },
        }
      );
      const userInfo = await userInfoResponse.json();

      // Enviar token e información a TU backend
      const backendData = await apiFetch("auth/google/callback", {
        method: "POST",
        body: JSON.stringify({
          accessToken: authentication.accessToken,
          userInfo: userInfo,
        }),
      });

      Alert.alert("¡Bienvenido!", `Hola ${userInfo.name}`);
    } catch (error) {
      console.error("Error en la autenticación:", error);
      Alert.alert("Error", "No se pudo completar el inicio de sesión.");
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = () => {
    promptAsync();
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.backgroundSecondary }]}
    >
      <View style={styles.container}>
        {/* Header Section */}
        <Animated.View
          style={[
            styles.header,
            {
              backgroundColor: theme.primary,
              shadowColor: isDark ? "#000" : theme.primary,
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
            },
          ]}
        >
          <View style={styles.welcomeSection}>
            <Text style={[styles.welcomeTitle, { color: theme.text }]}>
              ¡Bienvenido!
            </Text>
            <Text
              style={[styles.welcomeSubtitle, { color: theme.textSecondary }]}
            >
              Inicia sesión para comenzar tu journey fitness
            </Text>
          </View>

          {/* Login Buttons */}
          <View style={styles.buttonsContainer}>
            {/* Google Login Button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  shadowColor: theme.shadowColor,
                  opacity: isLoading || !request ? 0.6 : 1,
                },
              ]}
              onPress={loginWithGoogle}
              disabled={isLoading || !request}
              activeOpacity={0.7}
            >
              <View style={styles.buttonContent}>
                <View style={styles.googleIconContainer}>
                  <Text style={styles.buttonIcon}>G</Text>
                </View>
                <View style={styles.textContainer}>
                  <Text style={[styles.buttonText, { color: theme.text }]}>
                    {isLoading ? "Conectando..." : "Continuar con Google"}
                  </Text>
                  <Text
                    style={[
                      styles.buttonSubtext,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Inicia sesión rápidamente
                  </Text>
                </View>
                {isLoading ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <Text style={[styles.arrow, { color: theme.primary }]}>
                    →
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>
              Al continuar, aceptas nuestros{" "}
              <Text style={[styles.footerLink, { color: theme.primary }]}>
                Términos de servicio
              </Text>{" "}
              y{" "}
              <Text style={[styles.footerLink, { color: theme.primary }]}>
                Política de privacidad
              </Text>
            </Text>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 30,
    paddingTop: 60,
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
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
    opacity: 0.95,
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
    paddingHorizontal: 24,
    paddingTop: 40,
    justifyContent: "space-between",
  },
  welcomeSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  welcomeSubtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
  },
  buttonsContainer: {
    gap: 16,
    marginBottom: 40,
  },
  loginButton: {
    borderRadius: 16,
    padding: 20,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1.5,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  googleIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#4285F4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
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
    marginBottom: 4,
  },
  buttonSubtext: {
    fontSize: 13,
    fontWeight: "500",
  },
  arrow: {
    fontSize: 24,
    fontWeight: "bold",
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  footerLink: {
    fontWeight: "600",
  },
});
