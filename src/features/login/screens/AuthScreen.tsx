import { useNavigation } from "@react-navigation/native";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../../contexts/ThemeContext";
import { ENV } from "../../../environments/environment";
import { useAuthStore } from "../../../store/useAuthStore";
import { googleLogin, login, register } from "../services/authService";
import { CaughtError, getErrorMessage } from "../../../types";

WebBrowser.maybeCompleteAuthSession();
type AuthMode = "login" | "register";

interface GoogleAuthentication {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresIn?: number;
  issuedAt?: number;
}

export default function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
  const { theme, isDark } = useTheme();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const setAuth = useAuthStore((state) => state.setAuth);
  const navigation = useNavigation();

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: ENV.GOOGLE_CLIENT_ID_IOS,
    webClientId: ENV.GOOGLE_CLIENT_ID_WEB,
    scopes: ["openid", "profile", "email"],
  });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 9,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (response?.type === "success") {
      handleGoogleAuthSuccess(response.authentication as GoogleAuthentication);
    }
  }, [response]);

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const isStrongPassword = (value: string) =>
    value.length >= 8 &&
    value.length <= 72 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value);

  const handleGoogleAuthSuccess = async (
    authentication: GoogleAuthentication
  ) => {
    setIsLoading(true);
    try {
      if (!ENV.GOOGLE_CLIENT_ID_IOS || !ENV.GOOGLE_CLIENT_ID_WEB) {
        throw new Error(
          "Falta configurar EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS/WEB en la app."
        );
      }

      if (!authentication?.idToken) {
        throw new Error(
          "No se obtuvo idToken de Google. Revisa la configuración OAuth para iOS Dev Build."
        );
      }

      const authResponse = await googleLogin(authentication.idToken);

      setAuth(authResponse.user, authResponse.tokens);
      Alert.alert("¡Bienvenido!", `Hola ${authResponse.user.name}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error al conectar con Google";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (
      !email ||
      !password ||
      (mode === "register" && (!name || !confirmPassword))
    ) {
      Alert.alert("Error", "Completa todos los campos");
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert("Email inválido", "Introduce un correo electrónico válido.");
      return;
    }

    if (mode === "register") {
      if (name.trim().length < 2 || name.trim().length > 80) {
        Alert.alert(
          "Nombre inválido",
          "El nombre debe tener entre 2 y 80 caracteres."
        );
        return;
      }

      if (!isStrongPassword(password)) {
        Alert.alert(
          "Contraseña insegura",
          "Debe tener 8-72 caracteres, mayúscula, minúscula, número y símbolo."
        );
        return;
      }

      if (password !== confirmPassword) {
        Alert.alert("Error", "Las contraseñas no coinciden.");
        return;
      }
    }

    setIsLoading(true);
    try {
      const authResponse =
        mode === "login"
          ? await login({ email: email.trim(), password })
          : await register({
              email: email.trim(),
              password,
              name: name.trim(),
            });

      setAuth(authResponse.user, authResponse.tokens);
      Alert.alert(
        mode === "login" ? "¡Hola de nuevo!" : "¡Cuenta creada!",
        `Bienvenido ${authResponse.user.name}`
      );
    } catch (error: CaughtError) {
      Alert.alert(
        "Error",
        getErrorMessage(error) || "Error en la autenticación"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
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
    setConfirmPassword("");
    setName("");
  };

  const handleNavigateForgotPassword = () => {
    (navigation as any).navigate("ForgotPassword", {
      email: email.trim() || undefined,
    });
  };

  return (
    <View style={[styles.mainContainer, { backgroundColor: theme.background }]}>
      {/* Decorative Gradient Background */}
      <View style={styles.decorativeBackground}>
        <View
          style={[
            styles.gradientBlob1,
            {
              backgroundColor: theme.primary,
            },
          ]}
        />
        <View
          style={[
            styles.gradientBlob2,
            {
              backgroundColor: theme.primary,
            },
          ]}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <SafeAreaView style={styles.safeArea}>
            <Animated.View
              style={[
                styles.contentContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              {/* Modern Header */}
              <View style={styles.header}>
                <View style={styles.brandContainer}>
                  <View
                    style={[
                      styles.brandAccent,
                      { backgroundColor: theme.primary },
                    ]}
                  />
                  <Text style={[styles.brandName, { color: theme.text }]}>
                    EvoFit
                  </Text>
                </View>

                <View style={styles.headerTextContainer}>
                  <Text style={[styles.welcomeText, { color: theme.text }]}>
                    {mode === "login"
                      ? "Bienvenido de vuelta"
                      : "Crea tu cuenta"}
                  </Text>
                  <Text
                    style={[
                      styles.subtitleText,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {mode === "login"
                      ? "Continúa tu progreso fitness"
                      : "Empieza tu transformación hoy"}
                  </Text>
                </View>
              </View>

              {/* Form Container */}
              <View
                style={[
                  styles.formContainer,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.04)"
                      : "#FFFFFF",
                  },
                ]}
              >
                {mode === "register" && (
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.text }]}>
                      Nombre completo
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.06)"
                            : "#F9FAFB",
                          color: theme.text,
                          borderColor: nameFocused
                            ? theme.primary
                            : "transparent",
                        },
                      ]}
                      placeholder="Tu nombre"
                      placeholderTextColor={theme.textTertiary}
                      value={name}
                      onChangeText={setName}
                      onFocus={() => setNameFocused(true)}
                      onBlur={() => setNameFocused(false)}
                    />
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>
                    Email
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.06)"
                          : "#F9FAFB",
                        color: theme.text,
                        borderColor: emailFocused
                          ? theme.primary
                          : "transparent",
                      },
                    ]}
                    placeholder="tu@email.com"
                    placeholderTextColor={theme.textTertiary}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>
                    Contraseña
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.06)"
                          : "#F9FAFB",
                        color: theme.text,
                        borderColor: passwordFocused
                          ? theme.primary
                          : "transparent",
                      },
                    ]}
                    placeholder="••••••••"
                    placeholderTextColor={theme.textTertiary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                  />
                  {mode === "login" && (
                    <TouchableOpacity
                      onPress={handleNavigateForgotPassword}
                      activeOpacity={0.7}
                      style={styles.forgotPasswordContainer}
                    >
                      <Text
                        style={[
                          styles.forgotPassword,
                          { color: theme.primary },
                        ]}
                      >
                        ¿Olvidaste tu contraseña?
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {mode === "register" && (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: theme.text }]}>
                        Confirmar contraseña
                      </Text>
                      <TextInput
                        style={[
                          styles.input,
                          {
                            backgroundColor: isDark
                              ? "rgba(255,255,255,0.06)"
                              : "#F9FAFB",
                            color: theme.text,
                            borderColor: confirmPasswordFocused
                              ? theme.primary
                              : "transparent",
                          },
                        ]}
                        placeholder="••••••••"
                        placeholderTextColor={theme.textTertiary}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        onFocus={() => setConfirmPasswordFocused(true)}
                        onBlur={() => setConfirmPasswordFocused(false)}
                      />
                    </View>
                    <Text
                      style={[
                        styles.passwordRequirements,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Mínimo 8 caracteres con mayúscula, minúscula, número y
                      símbolo
                    </Text>
                  </>
                )}

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    {
                      backgroundColor: theme.primary,
                      opacity: isLoading ? 0.7 : 1,
                    },
                  ]}
                  onPress={handleEmailAuth}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.divider}>
                  <View
                    style={[
                      styles.dividerLine,
                      { backgroundColor: theme.border },
                    ]}
                  />
                  <Text
                    style={[styles.dividerText, { color: theme.textSecondary }]}
                  >
                    O continúa con
                  </Text>
                  <View
                    style={[
                      styles.dividerLine,
                      { backgroundColor: theme.border },
                    ]}
                  />
                </View>

                {/* Google Button */}
                <TouchableOpacity
                  style={[
                    styles.googleButton,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "#FFFFFF",
                      borderColor: isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB",
                    },
                    (isLoading || !request) && styles.disabledButton,
                  ]}
                  onPress={() => promptAsync()}
                  disabled={isLoading || !request}
                  activeOpacity={0.7}
                >
                  <View style={styles.googleIconContainer}>
                    <Image
                      source={require("../../../../assets/google-logo.png")}
                      style={styles.googleIcon}
                      resizeMode="contain"
                    />
                  </View>
                  <Text
                    style={[
                      styles.googleButtonText,
                      { color: isDark ? "#F9FAFB" : "#1F2937" },
                    ]}
                  >
                    Continuar con Google
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Footer Toggle */}
              <View style={styles.footer}>
                <Text
                  style={[styles.footerText, { color: theme.textSecondary }]}
                >
                  {mode === "login"
                    ? "¿No tienes cuenta?"
                    : "¿Ya tienes cuenta?"}
                </Text>
                <TouchableOpacity onPress={toggleMode} activeOpacity={0.7}>
                  <Text style={[styles.footerLink, { color: theme.primary }]}>
                    {mode === "login" ? "Regístrate" : "Inicia sesión"}
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </SafeAreaView>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  decorativeBackground: {
    position: "absolute",
    width: "100%",
    height: "100%",
    overflow: "hidden",
  },
  gradientBlob1: {
    position: "absolute",
    width: 400,
    height: 400,
    borderRadius: 200,
    opacity: 0.08,
    top: -150,
    right: -100,
    transform: [{ rotate: "45deg" }],
  },
  gradientBlob2: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.06,
    bottom: -100,
    left: -80,
    transform: [{ rotate: "-30deg" }],
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  safeArea: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: 40,
    gap: 40,
  },
  header: {
    gap: 24,
  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  brandAccent: {
    width: 4,
    height: 32,
    borderRadius: 2,
  },
  brandName: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -1,
  },
  headerTextContainer: {
    gap: 8,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 22,
  },
  formContainer: {
    borderRadius: 20,
    padding: 24,
    gap: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  forgotPasswordContainer: {
    alignSelf: "flex-end",
    marginTop: 4,
  },
  forgotPassword: {
    fontSize: 13,
    fontWeight: "600",
  },
  input: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 2,
    fontWeight: "500",
  },
  passwordRequirements: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: -8,
    marginLeft: 4,
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
    fontWeight: "500",
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  disabledButton: {
    opacity: 0.5,
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 15,
    fontWeight: "500",
  },
  footerLink: {
    fontSize: 15,
    fontWeight: "700",
  },
});
