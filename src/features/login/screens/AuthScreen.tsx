import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../../contexts/ThemeContext";
import {
  themeBarStyle,
  useFocusedStatusBar,
} from "../../../hooks/useFocusedStatusBar";
import { ENV } from "../../../environments/environment";
import { prefetchProductCatalog } from "../../nutrition/services/nutritionService";
import { prefetchExerciseCatalog } from "../../../services/exerciseService";
import { useAuthStore } from "../../../store/useAuthStore";
import {
  appleLogin,
  googleLogin,
  login,
  register,
  updateUserProfile,
} from "../services/authService";
import CompleteAppleProfileModal, {
  needsAppleProfileCompletion,
} from "../components/CompleteAppleProfileModal";
import { PasswordRequirementsHint } from "../components/PasswordRequirementsHint";
import {
  isPasswordFormReady,
  isStrongPassword,
} from "../utils/passwordValidation";
import { CaughtError, getErrorMessage } from "../../../types";
import type { UserResponseDto } from "@sergiomesasyelamos2000/shared";

WebBrowser.maybeCompleteAuthSession();
type AuthMode = "login" | "register";

const stripControlCharacters = (value: string) =>
  value.replace(/[\u0000-\u001F\u007F]/g, "");

const stripHtmlTags = (value: string) => value.replace(/<[^>]*>/g, "");

const collapseWhitespace = (value: string) => value.replace(/\s{2,}/g, " ");

const sanitizeFreeTextInput = (value: string) =>
  collapseWhitespace(stripHtmlTags(stripControlCharacters(value))).trim();

const sanitizePasswordInput = (value: string) => stripControlCharacters(value);

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
  const [googleSigninReady, setGoogleSigninReady] = useState(false);
  const [appleSigninReady, setAppleSigninReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPasswordRequirements, setShowPasswordRequirements] =
    useState(false);
  const [showPasswordMatch, setShowPasswordMatch] = useState(false);
  const [showAppleProfileModal, setShowAppleProfileModal] = useState(false);
  const [appleProfileUser, setAppleProfileUser] =
    useState<UserResponseDto | null>(null);
  const [savingAppleProfile, setSavingAppleProfile] = useState(false);
  const { theme, isDark } = useTheme();
  useFocusedStatusBar(themeBarStyle(isDark));

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const setAuth = useAuthStore((state) => state.setAuth);
  const updateUser = useAuthStore((state) => state.updateUser);
  const setWelcomeMessage = useAuthStore((state) => state.setWelcomeMessage);
  const navigation = useNavigation();

  const handleNameChange = (value: string) =>
    setName(sanitizeFreeTextInput(value));

  const handleEmailChange = (value: string) =>
    setEmail(sanitizeFreeTextInput(value));

  const handlePasswordChange = (value: string) =>
    setPassword(sanitizePasswordInput(value));

  const handleConfirmPasswordChange = (value: string) =>
    setConfirmPassword(sanitizePasswordInput(value));

  const googleClientIds = {
    ios: ENV.GOOGLE_CLIENT_ID_IOS,
    web: ENV.GOOGLE_CLIENT_ID_WEB,
  };

  const useGoogleAuthRequest =
    Platform.OS === "ios"
      ? Google.useAuthRequest
      : (..._args: unknown[]) => [
          null,
          null,
          async () => ({ type: "dismiss" as const }),
        ];

  const [request, response, promptAsync] = useGoogleAuthRequest(
    Platform.OS === "ios"
      ? {
          iosClientId: googleClientIds.ios,
          webClientId: googleClientIds.web,
          scopes: ["openid", "profile", "email"],
        }
      : {}
  );

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
    const missingIosClientId = Platform.OS === "ios" && !googleClientIds.ios;

    if (!googleClientIds.web || missingIosClientId) {
      setGoogleSigninReady(false);
      return;
    }

    try {
      GoogleSignin.configure({
        webClientId: googleClientIds.web,
        iosClientId: googleClientIds.ios || undefined,
        scopes: ["profile", "email"],
      });
      setGoogleSigninReady(true);
    } catch (error) {
      setGoogleSigninReady(false);
      console.warn("Google Sign-In config error", error);
    }
  }, [googleClientIds.ios, googleClientIds.web]);

  useEffect(() => {
    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== "ios") return;

    const res = response as any;
    if (!res || res.type !== "success") return;
    if (!res.authentication) return;

    handleGoogleAuthSuccess(res.authentication as GoogleAuthentication);
  }, [response]);

  useEffect(() => {
    if (Platform.OS !== "ios") return;

    let isMounted = true;

    void AppleAuthentication.isAvailableAsync()
      .then((isAvailable) => {
        if (isMounted) {
          setAppleSigninReady(isAvailable);
        }
      })
      .catch(() => {
        if (isMounted) {
          setAppleSigninReady(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const isRegisterPasswordReady = isPasswordFormReady(
    password,
    confirmPassword
  );
  const isPrimaryDisabled =
    isLoading || (mode === "register" && !isRegisterPasswordReady);

  const handleGoogleAuthSuccess = async (
    authentication: GoogleAuthentication
  ) => {
    setIsLoading(true);
    try {
      if (!authentication?.idToken) {
        throw new Error("No se obtuvo idToken de Google.");
      }
      const authResponse = await googleLogin(authentication.idToken);
      setAuth(authResponse.user, authResponse.tokens);
      void Promise.all([
        prefetchExerciseCatalog({ force: true }),
        prefetchProductCatalog({ force: true, pageSize: 24 }),
      ]);
      setWelcomeMessage(`Hola ${authResponse.user.name}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error al conectar con Google";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGooglePressAndroid = async () => {
    try {
      setIsLoading(true);
      if (!googleSigninReady) {
        throw new Error(
          "Google Sign-In no esta configurado. Revisa los Client IDs."
        );
      }
      await GoogleSignin.hasPlayServices();

      // Fuerza mostrar el selector de cuentas
      await GoogleSignin.signOut();
      await GoogleSignin.signIn();

      const { idToken } = await GoogleSignin.getTokens();
      if (!idToken) throw new Error("No se obtuvo idToken de Google.");

      const authResponse = await googleLogin(idToken);
      setAuth(authResponse.user, authResponse.tokens);
      void Promise.all([
        prefetchExerciseCatalog({ force: true }),
        prefetchProductCatalog({ force: true, pageSize: 24 }),
      ]);
      setWelcomeMessage(`Hola ${authResponse.user.name}`);
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) return;
      Alert.alert("Error", error.message || "Error al conectar con Google");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGooglePress = async () => {
    if (isLoading) return;

    if (Platform.OS === "android") {
      await handleGooglePressAndroid();
      return;
    }

    if (!request || !promptAsync) return;

    try {
      if (Platform.OS === "web") {
        await (promptAsync as any)({ windowName: "google-auth" });
        return;
      }
      await (promptAsync as any)();
    } catch (error) {
      const errorMessage = getErrorMessage(error as CaughtError);
      Alert.alert("Error", errorMessage);
    }
  };

  const handleApplePress = async () => {
    if (isLoading || Platform.OS !== "ios") return;

    if (!appleSigninReady) {
      Alert.alert(
        "Apple Sign In no disponible",
        "Este build de iOS no tiene Sign in with Apple disponible todavia. Recompila la app en iOS y prueba en un dispositivo o simulador con sesion de Apple activa."
      );
      return;
    }

    try {
      setIsLoading(true);

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error("No se obtuvo identityToken de Apple.");
      }

      const authResponse = await appleLogin({
        identityToken: credential.identityToken,
        authorizationCode: credential.authorizationCode || undefined,
        user: credential.user,
        email: credential.email || undefined,
        fullName: credential.fullName
          ? {
              givenName: credential.fullName.givenName,
              familyName: credential.fullName.familyName,
            }
          : undefined,
      });

      setAuth(authResponse.user, authResponse.tokens);
      void Promise.all([
        prefetchExerciseCatalog({ force: true }),
        prefetchProductCatalog({ force: true, pageSize: 24 }),
      ]);
      setWelcomeMessage(`Hola ${authResponse.user.name}`);

      if (needsAppleProfileCompletion(authResponse.user)) {
        setAppleProfileUser(authResponse.user);
        setShowAppleProfileModal(true);
      }
    } catch (error: any) {
      if (error?.code === "ERR_REQUEST_CANCELED") return;

      const errorMessage =
        error instanceof Error ? error.message : "Error al conectar con Apple";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAppleProfile = async (data: {
    name: string;
    email?: string;
  }) => {
    if (!appleProfileUser?.id) return;

    try {
      setSavingAppleProfile(true);
      const updates: { name: string; email?: string } = { name: data.name };
      if (data.email) {
        updates.email = data.email;
      }

      const updatedUser = await updateUserProfile(appleProfileUser.id, updates);
      updateUser(updatedUser);
      setWelcomeMessage(`Hola ${updatedUser.name}`);
      setShowAppleProfileModal(false);
      setAppleProfileUser(null);
    } catch (error) {
      const errorMessage = getErrorMessage(error as CaughtError);
      Alert.alert(
        "Error",
        errorMessage || "No se pudo guardar el perfil. Inténtalo de nuevo."
      );
    } finally {
      setSavingAppleProfile(false);
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
      void Promise.all([
        prefetchExerciseCatalog({ force: true }),
        prefetchProductCatalog({ force: true, pageSize: 24 }),
      ]);
      setWelcomeMessage(`Bienvenido ${authResponse.user.name}`);
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
    const nextMode = mode === "login" ? "register" : "login";

    const resetFields = () => {
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setName("");
      setShowPasswordRequirements(false);
      setShowPasswordMatch(false);
    };

    if (Platform.OS === "android") {
      Keyboard.dismiss();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setMode(nextMode);
      resetFields();
      return;
    }

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

    setMode(nextMode);
    resetFields();
  };

  const handleNavigateForgotPassword = () => {
    (navigation as any).navigate("ForgotPassword", {
      email: email.trim() || undefined,
    });
  };

  const isGoogleButtonDisabled =
    isLoading || (Platform.OS === "ios" && !request);
  const showGoogleLogin = true;
  const showAppleLogin = Platform.OS === "ios" && appleSigninReady;
  const showSocialLogin = showGoogleLogin || showAppleLogin;

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isCompactHeight = windowHeight < 700;
  const formMaxWidth = windowWidth >= 480 ? 400 : undefined;
  const showRegisterRequirements =
    mode === "register" &&
    (passwordFocused || showPasswordRequirements || password.length > 0);
  const showRegisterMatch =
    mode === "register" &&
    (showPasswordMatch || confirmPassword.length >= 2);

  const fieldBackground = isDark ? "rgba(255,255,255,0.06)" : "#F9FAFB";
  const cardBackground = isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF";

  return (
    <View style={[styles.mainContainer, { backgroundColor: theme.background }]}>
      <View style={styles.decorativeBackground}>
        <View
          style={[styles.gradientBlob1, { backgroundColor: theme.primary }]}
        />
        <View
          style={[styles.gradientBlob2, { backgroundColor: theme.primary }]}
        />
      </View>

      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              isCompactHeight && styles.scrollContentCompact,
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View
              style={[
                styles.contentContainer,
                isCompactHeight && styles.contentContainerCompact,
                formMaxWidth != null && {
                  maxWidth: formMaxWidth,
                  alignSelf: "center",
                  width: "100%",
                },
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View
                style={[styles.header, isCompactHeight && styles.headerCompact]}
              >
                <View style={styles.brandContainer}>
                  <View
                    style={[
                      styles.brandAccent,
                      { backgroundColor: theme.primary },
                    ]}
                  />
                  <Text
                    style={[
                      styles.brandName,
                      isCompactHeight && styles.brandNameCompact,
                      { color: theme.text },
                    ]}
                  >
                    EvoFit
                  </Text>
                </View>

                <View style={styles.headerTextContainer}>
                  <Text
                    style={[
                      styles.welcomeText,
                      isCompactHeight && styles.welcomeTextCompact,
                      { color: theme.text },
                    ]}
                  >
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

              <View
                style={[
                  styles.formContainer,
                  isCompactHeight && styles.formContainerCompact,
                  { backgroundColor: cardBackground },
                ]}
              >
                {showSocialLogin && (
                  <>
                    {showAppleLogin && (
                      <View
                        style={[
                          styles.appleButtonContainer,
                          isLoading && styles.disabledButton,
                        ]}
                        pointerEvents={isLoading ? "none" : "auto"}
                      >
                        <AppleAuthentication.AppleAuthenticationButton
                          buttonType={
                            AppleAuthentication.AppleAuthenticationButtonType
                              .CONTINUE
                          }
                          buttonStyle={
                            isDark
                              ? AppleAuthentication
                                  .AppleAuthenticationButtonStyle.WHITE
                              : AppleAuthentication
                                  .AppleAuthenticationButtonStyle.BLACK
                          }
                          cornerRadius={12}
                          style={styles.appleNativeButton}
                          onPress={handleApplePress}
                        />
                      </View>
                    )}

                    {showGoogleLogin && (
                      <TouchableOpacity
                        style={[
                          styles.googleButton,
                          {
                            backgroundColor: fieldBackground,
                            borderColor: isDark
                              ? "rgba(255,255,255,0.1)"
                              : "#E5E7EB",
                          },
                          isGoogleButtonDisabled && styles.disabledButton,
                        ]}
                        onPress={handleGooglePress}
                        disabled={isGoogleButtonDisabled}
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
                    )}

                    <View style={styles.divider}>
                      <View
                        style={[
                          styles.dividerLine,
                          { backgroundColor: theme.border },
                        ]}
                      />
                      <Text
                        style={[
                          styles.dividerText,
                          { color: theme.textSecondary },
                        ]}
                      >
                        O continúa con email
                      </Text>
                      <View
                        style={[
                          styles.dividerLine,
                          { backgroundColor: theme.border },
                        ]}
                      />
                    </View>
                  </>
                )}

                {mode === "register" && (
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.text }]}>
                      Nombre completo
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: fieldBackground,
                          color: theme.text,
                          borderColor: nameFocused
                            ? theme.primary
                            : "transparent",
                        },
                      ]}
                      placeholder="Tu nombre"
                      placeholderTextColor={theme.textTertiary}
                      value={name}
                      onChangeText={handleNameChange}
                      autoComplete="name"
                      textContentType="name"
                      importantForAutofill="yes"
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
                        backgroundColor: fieldBackground,
                        color: theme.text,
                        borderColor: emailFocused
                          ? theme.primary
                          : "transparent",
                      },
                    ]}
                    placeholder="email@ejemplo.com"
                    placeholderTextColor={theme.textTertiary}
                    value={email}
                    onChangeText={handleEmailChange}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    autoComplete="email"
                    textContentType="username"
                    importantForAutofill="yes"
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>
                    Contraseña
                  </Text>
                  <View
                    style={[
                      styles.passwordInputContainer,
                      {
                        backgroundColor: fieldBackground,
                        borderColor: passwordFocused
                          ? theme.primary
                          : "transparent",
                      },
                    ]}
                  >
                    <TextInput
                      style={[styles.input, styles.passwordInput]}
                      placeholder="••••••••"
                      placeholderTextColor={theme.textTertiary}
                      value={password}
                      onChangeText={handlePasswordChange}
                      secureTextEntry={!showPassword}
                      autoComplete={
                        mode === "login" ? "current-password" : "new-password"
                      }
                      textContentType={
                        mode === "login" ? "password" : "newPassword"
                      }
                      importantForAutofill="yes"
                      onFocus={() => {
                        setPasswordFocused(true);
                        if (mode === "register") {
                          setShowPasswordRequirements(true);
                        }
                      }}
                      onBlur={() => {
                        setPasswordFocused(false);
                        if (mode === "register") {
                          setShowPasswordRequirements(true);
                        }
                      }}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowPassword((prev) => !prev)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color={theme.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                  {mode === "register" && (
                    <PasswordRequirementsHint
                      password={password}
                      confirmPassword={confirmPassword}
                      showRequirements={showRegisterRequirements}
                      showMatch={false}
                    />
                  )}
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
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.text }]}>
                      Confirmar contraseña
                    </Text>
                    <View
                      style={[
                        styles.passwordInputContainer,
                        {
                          backgroundColor: fieldBackground,
                          borderColor: confirmPasswordFocused
                            ? theme.primary
                            : "transparent",
                        },
                      ]}
                    >
                      <TextInput
                        style={[styles.input, styles.passwordInput]}
                        placeholder="••••••••"
                        placeholderTextColor={theme.textTertiary}
                        value={confirmPassword}
                        onChangeText={handleConfirmPasswordChange}
                        secureTextEntry={!showConfirmPassword}
                        autoComplete="new-password"
                        textContentType="newPassword"
                        importantForAutofill="yes"
                        onFocus={() => setConfirmPasswordFocused(true)}
                        onBlur={() => {
                          setConfirmPasswordFocused(false);
                          setShowPasswordMatch(true);
                        }}
                      />
                      <TouchableOpacity
                        style={styles.eyeButton}
                        onPress={() =>
                          setShowConfirmPassword((prev) => !prev)
                        }
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={
                            showConfirmPassword
                              ? "eye-off-outline"
                              : "eye-outline"
                          }
                          size={20}
                          color={theme.textSecondary}
                        />
                      </TouchableOpacity>
                    </View>
                    <PasswordRequirementsHint
                      password={password}
                      confirmPassword={confirmPassword}
                      showRequirements={false}
                      showMatch={showRegisterMatch}
                    />
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    {
                      backgroundColor: theme.primary,
                      opacity: isPrimaryDisabled ? 0.5 : 1,
                    },
                    isPrimaryDisabled && styles.disabledButton,
                  ]}
                  onPress={handleEmailAuth}
                  disabled={isPrimaryDisabled}
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <ActivityIndicator color={theme.onPrimary} size="small" />
                  ) : (
                    <Text
                      style={[
                        styles.primaryButtonText,
                        { color: theme.onPrimary },
                      ]}
                    >
                      {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

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
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <CompleteAppleProfileModal
        visible={showAppleProfileModal}
        initialName={appleProfileUser?.name}
        initialEmail={appleProfileUser?.email}
        saving={savingAppleProfile}
        onClose={() => {
          setShowAppleProfileModal(false);
          setAppleProfileUser(null);
        }}
        onSave={handleSaveAppleProfile}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1 },
  flex: { flex: 1 },
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
  safeArea: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  scrollContentCompact: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  contentContainer: {
    gap: 24,
    paddingBottom: 8,
  },
  contentContainerCompact: {
    gap: 16,
  },
  header: { gap: 16 },
  headerCompact: { gap: 10 },
  brandContainer: { flexDirection: "row", alignItems: "center", gap: 12 },
  brandAccent: { width: 4, height: 28, borderRadius: 2 },
  brandName: { fontSize: 28, fontWeight: "800", letterSpacing: -1 },
  brandNameCompact: { fontSize: 24 },
  headerTextContainer: { gap: 6 },
  welcomeText: { fontSize: 24, fontWeight: "700", letterSpacing: -0.5 },
  welcomeTextCompact: { fontSize: 22 },
  subtitleText: { fontSize: 15, fontWeight: "400", lineHeight: 20 },
  formContainer: {
    borderRadius: 20,
    padding: 20,
    gap: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
      web: {
        boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
      },
    }),
  },
  formContainerCompact: {
    padding: 16,
    gap: 14,
  },
  inputGroup: { gap: 8 },
  inputLabel: { fontSize: 14, fontWeight: "600", marginLeft: 4 },
  forgotPasswordContainer: { alignSelf: "flex-end", marginTop: 4 },
  forgotPassword: { fontSize: 13, fontWeight: "600" },
  input: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 2,
    fontWeight: "500",
    // RN Web draws a native focus outline on <input>; we style focus via borderColor.
    ...Platform.select({
      web: { outlineStyle: "none" as const, outlineWidth: 0 },
    }),
  },
  passwordInputContainer: {
    borderRadius: 12,
    borderWidth: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  passwordInput: {
    flex: 1,
    borderWidth: 0,
    paddingRight: 8,
    // Keep outline off the inner field so only the outer purple border shows on focus.
    ...Platform.select({
      web: { outlineStyle: "none" as const, outlineWidth: 0 },
    }),
  },
  eyeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
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
      android: { elevation: 4 },
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
    gap: 12,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13, fontWeight: "500" },
  appleButtonContainer: {
    width: "100%",
  },
  appleNativeButton: {
    width: "100%",
    height: 52,
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
      android: { elevation: 1 },
    }),
  },
  disabledButton: { opacity: 0.5 },
  googleIconContainer: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  googleIcon: { width: 20, height: 20 },
  googleButtonText: { fontSize: 15, fontWeight: "600" },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingTop: 4,
    paddingBottom: 8,
  },
  footerText: { fontSize: 15, fontWeight: "500" },
  footerLink: { fontSize: 15, fontWeight: "700" },
});
