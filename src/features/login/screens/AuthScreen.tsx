import { useNavigation } from "@react-navigation/native";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
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
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

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
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
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
      {/* Gradient Background Effect */}
      <View style={styles.gradientContainer}>
        <Animated.View
          style={[
            styles.gradientCircle,
            {
              backgroundColor: theme.primary,
              opacity: 0.15,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.gradientCircle2,
            {
              backgroundColor: theme.primary,
              opacity: 0.1,
              transform: [{ scale: scaleAnim }],
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
        >
          <SafeAreaView style={{ flex: 1 }}>
            <Animated.View
              style={[
                styles.contentContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
                },
              ]}
            >
              {/* Logo & Header */}
              <View style={styles.headerSection}>
                <Animated.View
                  style={[
                    styles.logoContainer,
                    {
                      backgroundColor: `${theme.primary}20`,
                      transform: [{ scale: pulseAnim }],
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.logoInner,
                      { backgroundColor: theme.primary },
                    ]}
                  >
                    <Text style={styles.logoText}>FT</Text>
                  </View>
                </Animated.View>

                <View style={styles.titleContainer}>
                  <Text style={[styles.mainTitle, { color: theme.text }]}>
                    {mode === "login" ? "Bienvenido" : "Únete a"}
                  </Text>
                  <Text style={[styles.brandTitle, { color: theme.primary }]}>
                    FitTrack
                  </Text>
                </View>

                <Text
                  style={[styles.description, { color: theme.textSecondary }]}
                >
                  {mode === "login"
                    ? "Continúa tu journey fitness"
                    : "Empieza tu transformación hoy"}
                </Text>
              </View>

              {/* Form Card */}
              <View
                style={[
                  styles.formCard,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(255,255,255,0.9)",
                    borderColor: theme.border,
                  },
                ]}
              >
                {mode === "register" && (
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={[
                        styles.modernInput,
                        {
                          backgroundColor: theme.card,
                          color: theme.text,
                          borderColor: nameFocused
                            ? theme.primary
                            : "transparent",
                        },
                      ]}
                      placeholder="Nombre completo"
                      placeholderTextColor={theme.textTertiary}
                      value={name}
                      onChangeText={setName}
                      onFocus={() => setNameFocused(true)}
                      onBlur={() => setNameFocused(false)}
                    />
                  </View>
                )}

                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[
                      styles.modernInput,
                      {
                        backgroundColor: theme.card,
                        color: theme.text,
                        borderColor: emailFocused
                          ? theme.primary
                          : "transparent",
                      },
                    ]}
                    placeholder="Email"
                    placeholderTextColor={theme.textTertiary}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[
                      styles.modernInput,
                      {
                        backgroundColor: theme.card,
                        color: theme.text,
                        borderColor: passwordFocused
                          ? theme.primary
                          : "transparent",
                      },
                    ]}
                    placeholder="Contraseña"
                    placeholderTextColor={theme.textTertiary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                  />
                </View>

                {mode === "register" && (
                  <>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={[
                          styles.modernInput,
                          {
                            backgroundColor: theme.card,
                            color: theme.text,
                            borderColor: confirmPasswordFocused
                              ? theme.primary
                              : "transparent",
                          },
                        ]}
                        placeholder="Confirmar contraseña"
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
                        styles.passwordHint,
                        { color: theme.textSecondary },
                      ]}
                    >
                      8-72 caracteres, con mayúscula, minúscula, número y
                      símbolo.
                    </Text>
                  </>
                )}

                {mode === "login" && (
                  <TouchableOpacity
                    onPress={handleNavigateForgotPassword}
                    style={styles.forgotPasswordLink}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.forgotPasswordText,
                        { color: theme.primary },
                      ]}
                    >
                      ¿Olvidaste tu contraseña?
                    </Text>
                  </TouchableOpacity>
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
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Text style={styles.primaryButtonText}>
                        {mode === "login" ? "Iniciar Sesión" : "Crear Cuenta"}
                      </Text>
                      <Text style={styles.buttonArrow}>→</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.dividerContainer}>
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
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={() => promptAsync()}
                  disabled={isLoading || !request}
                  activeOpacity={0.7}
                >
                  <View style={styles.googleLogo}>
                    <Text style={styles.googleG}>G</Text>
                  </View>
                  <Text
                    style={[styles.googleButtonText, { color: theme.text }]}
                  >
                    Google
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Toggle Mode */}
              <TouchableOpacity
                onPress={toggleMode}
                style={styles.toggleContainer}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.toggleText, { color: theme.textSecondary }]}
                >
                  {mode === "login"
                    ? "¿No tienes cuenta?"
                    : "¿Ya tienes cuenta?"}
                </Text>
                <Text style={[styles.toggleAction, { color: theme.primary }]}>
                  {mode === "login" ? "Regístrate" : "Inicia sesión"}
                </Text>
              </TouchableOpacity>
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
  gradientContainer: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  gradientCircle: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    top: -100,
    right: -100,
  },
  gradientCircle2: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 125,
    bottom: -50,
    left: -80,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    gap: 32,
  },
  headerSection: {
    alignItems: "center",
    gap: 20,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  logoInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  titleContainer: {
    alignItems: "center",
    gap: 4,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: "600",
    letterSpacing: -0.5,
  },
  brandTitle: {
    fontSize: 40,
    fontWeight: "900",
    letterSpacing: -1,
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    opacity: 0.8,
  },
  formCard: {
    borderRadius: 24,
    padding: 24,
    gap: 16,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  inputWrapper: {
    gap: 8,
  },
  passwordHint: {
    fontSize: 12,
    marginTop: -4,
    marginBottom: 4,
  },
  forgotPasswordLink: {
    alignSelf: "flex-end",
    marginTop: -4,
    marginBottom: 4,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: "700",
  },
  modernInput: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    borderWidth: 2,
    fontWeight: "500",
  },
  primaryButton: {
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  primaryButtonText: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  buttonArrow: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "bold",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    opacity: 0.3,
  },
  dividerText: {
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.6,
  },
  googleButton: {
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderWidth: 2,
  },
  googleLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#4285F4",
    justifyContent: "center",
    alignItems: "center",
  },
  googleG: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  toggleText: {
    fontSize: 15,
    fontWeight: "500",
  },
  toggleAction: {
    fontSize: 15,
    fontWeight: "800",
  },
});
