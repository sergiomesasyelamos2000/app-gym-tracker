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
import { useTheme } from "../../../contexts/ThemeContext";

WebBrowser.maybeCompleteAuthSession();

type AuthMode = "login" | "register";

export default function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const { theme, isDark } = useTheme();

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
        Alert.alert("¡Cuenta creada!", `Bienvenido ${authResponse.user.name}`);
      }
    } catch (error: any) {
      console.error("Error en autenticación:", error);
      Alert.alert(
        "Error",
        error.message ||
          `No se pudo ${
            mode === "login" ? "iniciar sesión" : "crear la cuenta"
          }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.5,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    setMode(mode === "login" ? "register" : "login");
    setEmail("");
    setPassword("");
    setName("");
  };

  const loginWithGoogle = () => {
    promptAsync();
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.backgroundSecondary }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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
              },
            ]}
          >
            <View style={styles.welcomeSection}>
              <Text style={[styles.welcomeTitle, { color: theme.text }]}>
                {mode === "login" ? "¡Bienvenido!" : "Crear cuenta"}
              </Text>
              <Text
                style={[styles.welcomeSubtitle, { color: theme.textSecondary }]}
              >
                {mode === "login"
                  ? "Inicia sesión para continuar"
                  : "Regístrate para comenzar tu journey fitness"}
              </Text>
            </View>

            {/* Email/Password Form */}
            <View style={styles.formContainer}>
              {mode === "register" && (
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>
                    Nombre completo
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.inputBackground,
                        borderColor: theme.inputBorder,
                        color: theme.text,
                      },
                    ]}
                    placeholder="Ingresa tu nombre"
                    placeholderTextColor={theme.textTertiary}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    editable={!isLoading}
                  />
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Email</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.inputBackground,
                      borderColor: theme.inputBorder,
                      color: theme.text,
                    },
                  ]}
                  placeholder="tucorreo@ejemplo.com"
                  placeholderTextColor={theme.textTertiary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text }]}>
                  Contraseña
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.inputBackground,
                      borderColor: theme.inputBorder,
                      color: theme.text,
                    },
                  ]}
                  placeholder="••••••••"
                  placeholderTextColor={theme.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!isLoading}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: theme.primary,
                    shadowColor: theme.primary,
                    opacity: isLoading ? 0.7 : 1,
                  },
                ]}
                onPress={handleEmailAuth}
                disabled={isLoading}
                activeOpacity={0.8}
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
              <View
                style={[styles.dividerLine, { backgroundColor: theme.divider }]}
              />
              <Text
                style={[styles.dividerText, { color: theme.textSecondary }]}
              >
                o continúa con
              </Text>
              <View
                style={[styles.dividerLine, { backgroundColor: theme.divider }]}
              />
            </View>

            {/* Google Login Button */}
            <TouchableOpacity
              style={[
                styles.googleButton,
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
                <Text style={[styles.googleButtonText, { color: theme.text }]}>
                  Continuar con Google
                </Text>
              </View>
            </TouchableOpacity>

            {/* Toggle Mode */}
            <TouchableOpacity
              style={styles.toggleModeButton}
              onPress={toggleMode}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.toggleModeText, { color: theme.textSecondary }]}
              >
                {mode === "login"
                  ? "¿No tienes cuenta? "
                  : "¿Ya tienes cuenta? "}
                <Text style={[styles.toggleModeLink, { color: theme.primary }]}>
                  {mode === "login" ? "Regístrate" : "Inicia sesión"}
                </Text>
              </Text>
            </TouchableOpacity>

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
        </ScrollView>
      </KeyboardAvoidingView>
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
  scrollContent: {
    flexGrow: 1,
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
  authSection: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 20,
  },
  welcomeSection: {
    alignItems: "center",
    marginBottom: 32,
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
  formContainer: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    borderWidth: 1.5,
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
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
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 14,
    fontWeight: "500",
  },
  googleButton: {
    borderRadius: 12,
    padding: 16,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
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
  },
  toggleModeButton: {
    marginTop: 24,
    alignItems: "center",
    paddingVertical: 8,
  },
  toggleModeText: {
    fontSize: 15,
  },
  toggleModeLink: {
    fontWeight: "700",
  },
  footer: {
    marginTop: 32,
    paddingHorizontal: 20,
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
