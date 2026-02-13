import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
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
import { CaughtError, getErrorMessage } from "../../../types";
import { forgotPassword, resetPassword } from "../services/authService";

type ForgotStep = "request" | "verify";

type RouteParams = {
  email?: string;
};

export default function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme, isDark } = useTheme();

  const prefilledEmail = (route.params as RouteParams | undefined)?.email || "";

  const [step, setStep] = useState<ForgotStep>("request");
  const [email, setEmail] = useState(prefilledEmail);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0);
  const [activeOtpIndex, setActiveOtpIndex] = useState(0);
  const [otpErrorActive, setOtpErrorActive] = useState(false);

  const emailInputRef = useRef<TextInput>(null);
  const codeInputRef = useRef<TextInput>(null);
  const otpShake = useRef(new Animated.Value(0)).current;
  const activePulse = useRef(new Animated.Value(1)).current;
  const otpErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (step === "request") {
        emailInputRef.current?.focus();
      } else {
        codeInputRef.current?.focus();
        setActiveOtpIndex(Math.min(code.length, 5));
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    if (resendSecondsLeft <= 0) return;

    const timer = setInterval(() => {
      setResendSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [resendSecondsLeft]);

  useEffect(() => {
    return () => {
      if (otpErrorTimerRef.current) {
        clearTimeout(otpErrorTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (step !== "verify") return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(activePulse, {
          toValue: 1.05,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(activePulse, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
      ]),
    );

    pulse.start();
    return () => pulse.stop();
  }, [step, activePulse]);

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const isStrongPassword = (value: string) =>
    value.length >= 8 &&
    value.length <= 72 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value);

  const canResend = resendSecondsLeft === 0 && !isLoading;
  const otpDigits = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => ({
        index,
        value: code[index] ?? "",
      })),
    [code],
  );

  const stepTitle = useMemo(
    () =>
      step === "request"
        ? "Recuperar contraseña"
        : "Introduce el código",
    [step],
  );

  const handleRequestCode = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      Alert.alert("Email inválido", "Introduce un correo electrónico válido.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await forgotPassword({ email: normalizedEmail });
      setStep("verify");
      setCode("");
      setResendSecondsLeft(60);
      Alert.alert(
        "Revisa tu correo",
        response.message || "Te hemos enviado un código de recuperación."
      );
    } catch (error: CaughtError) {
      Alert.alert("Error", getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      Alert.alert("Email inválido", "Introduce un correo electrónico válido.");
      return;
    }

    if (!/^\d{6}$/.test(code.trim())) {
      triggerOtpShake();
      Alert.alert("Código inválido", "Introduce un código de 6 dígitos.");
      return;
    }

    if (!isStrongPassword(newPassword)) {
      Alert.alert(
        "Contraseña insegura",
        "Debe tener 8-72 caracteres, mayúscula, minúscula, número y símbolo."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Las contraseñas no coinciden.");
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword({
        email: normalizedEmail,
        code: code.trim(),
        newPassword,
      });

      Alert.alert("Contraseña actualizada", "Ya puedes iniciar sesión.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error: CaughtError) {
      triggerOtpShake();
      Alert.alert("Error", getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!canResend) return;
    await handleRequestCode();
  };

  const handleOtpPress = (index: number) => {
    setActiveOtpIndex(index);
    codeInputRef.current?.focus();
  };

  const handleOtpChange = (value: string) => {
    const sanitized = value.replace(/[^0-9]/g, "").slice(0, 6);
    setCode(sanitized);
    setActiveOtpIndex(Math.min(sanitized.length, 5));
  };

  const triggerOtpShake = () => {
    setOtpErrorActive(true);
    if (otpErrorTimerRef.current) {
      clearTimeout(otpErrorTimerRef.current);
    }
    otpErrorTimerRef.current = setTimeout(() => {
      setOtpErrorActive(false);
    }, 1200);

    Animated.sequence([
      Animated.timing(otpShake, {
        toValue: 8,
        duration: 45,
        useNativeDriver: true,
      }),
      Animated.timing(otpShake, {
        toValue: -8,
        duration: 45,
        useNativeDriver: true,
      }),
      Animated.timing(otpShake, {
        toValue: 6,
        duration: 45,
        useNativeDriver: true,
      }),
      Animated.timing(otpShake, {
        toValue: -6,
        duration: 45,
        useNativeDriver: true,
      }),
      Animated.timing(otpShake, {
        toValue: 0,
        duration: 45,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View
            style={[
              styles.card,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(255,255,255,0.9)",
                borderColor: theme.border,
              },
            ]}
          >
            <Text style={[styles.title, { color: theme.text }]}>{stepTitle}</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {step === "request"
                ? "Te enviaremos un código por email para restablecer tu contraseña."
                : `Código enviado a ${email.trim().toLowerCase()}`}
            </Text>

            <View style={styles.steps}>
              <View
                style={[
                  styles.stepDot,
                  { backgroundColor: theme.primary },
                ]}
              />
              <View
                style={[
                  styles.stepLine,
                  { backgroundColor: theme.border },
                ]}
              />
              <View
                style={[
                  styles.stepDot,
                  { backgroundColor: step === "verify" ? theme.primary : `${theme.primary}44` },
                ]}
              />
            </View>

            <TextInput
              ref={emailInputRef}
              style={[
                styles.input,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              placeholder="Email"
              placeholderTextColor={theme.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              editable={!isLoading && step === "request"}
            />

            {step === "request" ? (
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: theme.primary }]}
                onPress={handleRequestCode}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Enviar código</Text>
                )}
              </TouchableOpacity>
            ) : (
              <>
                <Animated.View
                  style={[
                    styles.otpWrapper,
                    { transform: [{ translateX: otpShake }] },
                  ]}
                >
                  <TextInput
                    ref={codeInputRef}
                    value={code}
                    onChangeText={handleOtpChange}
                    keyboardType="number-pad"
                    maxLength={6}
                    textContentType="oneTimeCode"
                    autoComplete="one-time-code"
                    style={styles.hiddenOtpInput}
                    editable={!isLoading}
                  />

                  <View style={styles.otpRow}>
                    {otpDigits.map((digit) => {
                      const isFilled = !!digit.value;
                      const isActive =
                        activeOtpIndex === digit.index ||
                        (digit.index === code.length && code.length < 6);

                      return (
                        <Animated.View
                          key={`otp-${digit.index}`}
                          style={[
                            styles.otpBoxWrapper,
                            isActive && { transform: [{ scale: activePulse }] },
                          ]}
                        >
                          <Pressable
                            onPress={() => handleOtpPress(digit.index)}
                            style={[
                              styles.otpBox,
                              {
                                backgroundColor: theme.card,
                                borderColor: otpErrorActive
                                  ? theme.error
                                  : isActive
                                    ? theme.primary
                                    : isFilled
                                      ? theme.primaryLight
                                      : theme.border,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.otpText,
                                { color: otpErrorActive ? theme.error : theme.text },
                              ]}
                            >
                              {digit.value || ""}
                            </Text>
                          </Pressable>
                        </Animated.View>
                      );
                    })}
                  </View>
                </Animated.View>

                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                      color: theme.text,
                    },
                  ]}
                  placeholder="Nueva contraseña"
                  placeholderTextColor={theme.textTertiary}
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                  editable={!isLoading}
                />

                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                      color: theme.text,
                    },
                  ]}
                  placeholder="Confirmar nueva contraseña"
                  placeholderTextColor={theme.textTertiary}
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!isLoading}
                />

                <Text style={[styles.hint, { color: theme.textSecondary }]}>
                  8-72 caracteres, con mayúscula, minúscula, número y símbolo.
                </Text>

                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: theme.primary }]}
                  onPress={handleResetPassword}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Actualizar contraseña</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={handleResendCode}
                  disabled={!canResend}
                >
                  <Text
                    style={[
                      styles.linkText,
                      { color: canResend ? theme.primary : theme.textTertiary },
                    ]}
                  >
                    {canResend
                      ? "Reenviar código"
                      : `Reenviar código en ${resendSecondsLeft}s`}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => {
                    setStep("request");
                    setCode("");
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  disabled={isLoading}
                >
                  <Text style={[styles.linkText, { color: theme.textSecondary }]}>
                    Cambiar email
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.goBack()}
              disabled={isLoading}
            >
              <Text style={[styles.secondaryText, { color: theme.textSecondary }]}>
                Volver a iniciar sesión
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 30,
  },
  card: {
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 18,
    lineHeight: 20,
  },
  steps: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  stepDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 8,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 10,
  },
  otpWrapper: {
    marginBottom: 10,
  },
  hiddenOtpInput: {
    position: "absolute",
    opacity: 0,
    width: 1,
    height: 1,
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  otpBoxWrapper: {
    flex: 1,
  },
  otpBox: {
    width: "100%",
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  otpText: {
    fontSize: 24,
    fontWeight: "700",
  },
  hint: {
    fontSize: 12,
    marginTop: -2,
    marginBottom: 12,
  },
  primaryButton: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  primaryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  linkButton: {
    alignItems: "center",
    paddingVertical: 8,
    marginTop: 2,
  },
  linkText: {
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryButton: {
    alignItems: "center",
    paddingVertical: 10,
    marginTop: 6,
  },
  secondaryText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
