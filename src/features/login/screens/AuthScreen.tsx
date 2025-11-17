/**
 * AuthScreen - Unified Login and Register Screen
 *
 * Handles both email/password authentication and Google OAuth.
 * Integrates with auth store and navigation.
 */

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
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useAuthStore } from "../../../store/useAuthStore";
import { login, register, googleAuth } from "../services/authService";
import { useNavigation } from "@react-navigation/native";

WebBrowser.maybeCompleteAuthSession();

type AuthMode = "login" | "register";

export default function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const setAuth = useAuthStore((state) => state.setAuth);
  const navigation = useNavigation();

  // Google OAuth configuration
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId:
      "1019156813901-996dkn9dvnedm2bb7k2huapr3lsb98rt.apps.googleusercontent.com",
    androidClientId: "TU_ANDROID_CLIENT_ID.apps.googleusercontent.com",
    webClientId:
      "1019156813901-qsa5kq5sv3gvf20p76bnu074h2l3us7u.apps.googleusercontent.com",
    scopes: ["profile", "email"],
  });

  // Entrance animations
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

  // Handle Google OAuth response
  useEffect(() => {
    if (response?.type === "success") {
      handleGoogleAuthSuccess(response.authentication);
    }
  }, [response]);

  const handleGoogleAuthSuccess = async (authentication: any) => {
    setIsLoading(true);
    try {
      // Get user info from Google
      const userInfoResponse = await fetch(
        "https://www.googleapis.com/userinfo/v2/me",
        {
          headers: { Authorization: `Bearer ${authentication.accessToken}` },
        }
      );
      const userInfo = await userInfoResponse.json();

      // Send to backend
      const authResponse = await googleAuth({
        accessToken: authentication.accessToken,
        userInfo: {
          id: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
        },
      });

      // Store auth data
      setAuth(authResponse.user, authResponse.tokens);

      Alert.alert("¡Bienvenido!", `Hola ${authResponse.user.name}`);
      // Navigation will be handled by the navigator based on auth state
    } catch (error: any) {
      console.error("Error en la autenticación con Google:", error);
      Alert.alert(
        "Error",
        error.message || "No se pudo completar el inicio de sesión con Google."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Por favor completa todos los campos");
      return;
    }

    if (mode === "register" && !name) {
      Alert.alert("Error", "Por favor ingresa tu nombre");
      return;
    }

    setIsLoading(true);
    try {
      if (mode === "login") {
        const authResponse = await login({ email, password });
        setAuth(authResponse.user, authResponse.tokens);
        Alert.alert("¡Bienvenido!", `Hola ${authResponse.user.name}`);
      } else {
        const authResponse = await register({ email, password, name });
        setAuth(authResponse.user, authResponse.tokens);
        Alert.alert(
          "¡Cuenta creada!",
          `Bienvenido ${authResponse.user.name}`
        );
      }
    } catch (error: any) {
      console.error("Error en autenticación:", error);
      Alert.alert(
        "Error",
        error.message ||
          `No se pudo ${mode === "login" ? "iniciar sesión" : "crear la cuenta"}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setEmail("");
    setPassword("");
    setName("");
  };

  const loginWithGoogle = () => {
    promptAsync();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
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
              <Text style={styles.headerTitle}>FitTrack</Text>
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

          {/* Auth Section */}
          <Animated.View
            style={[
              styles.authSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeTitle}>
                {mode === "login" ? "¡Bienvenido!" : "Crear cuenta"}
              </Text>
              <Text style={styles.welcomeSubtitle}>
                {mode === "login"
                  ? "Inicia sesión para continuar"
                  : "Regístrate para comenzar tu journey fitness"}
              </Text>
            </View>

            {/* Email/Password Form */}
            <View style={styles.formContainer}>
              {mode === "register" && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Nombre completo</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ingresa tu nombre"
                    placeholderTextColor="#94A3B8"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    editable={!isLoading}
                  />
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="tucorreo@ejemplo.com"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Contraseña</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!isLoading}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={handleEmailAuth}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o continúa con</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Login Button */}
            <TouchableOpacity
              style={[
                styles.googleButton,
                (isLoading || !request) && styles.buttonDisabled,
              ]}
              onPress={loginWithGoogle}
              disabled={isLoading || !request}
            >
              <View style={styles.buttonContent}>
                <View style={styles.googleIconContainer}>
                  <Text style={styles.buttonIcon}>G</Text>
                </View>
                <Text style={styles.googleButtonText}>Continuar con Google</Text>
              </View>
            </TouchableOpacity>

            {/* Toggle Mode */}
            <TouchableOpacity
              style={styles.toggleModeButton}
              onPress={toggleMode}
              disabled={isLoading}
            >
              <Text style={styles.toggleModeText}>
                {mode === "login"
                  ? "¿No tienes cuenta? "
                  : "¿Ya tienes cuenta? "}
                <Text style={styles.toggleModeLink}>
                  {mode === "login" ? "Regístrate" : "Inicia sesión"}
                </Text>
              </Text>
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Al continuar, aceptas nuestros{" "}
                <Text style={styles.footerLink}>Términos de servicio</Text> y{" "}
                <Text style={styles.footerLink}>Política de privacidad</Text>
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
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
  authSection: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 40,
    paddingBottom: 20,
  },
  welcomeSection: {
    alignItems: "center",
    marginBottom: 30,
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
  formContainer: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1E293B",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  primaryButton: {
    backgroundColor: "#6C3BAA",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#6C3BAA",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 14,
    color: "#64748B",
  },
  googleButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#4285F4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  buttonIcon: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  toggleModeButton: {
    marginTop: 24,
    alignItems: "center",
  },
  toggleModeText: {
    fontSize: 14,
    color: "#64748B",
  },
  toggleModeLink: {
    color: "#6C3BAA",
    fontWeight: "600",
  },
  footer: {
    marginTop: 24,
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
