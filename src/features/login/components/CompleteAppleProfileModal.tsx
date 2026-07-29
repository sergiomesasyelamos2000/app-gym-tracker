import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../../../contexts/ThemeContext";

export function isApplePrivateRelayEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase().endsWith("@privaterelay.appleid.com");
}

export function isLikelyApplePlaceholderName(
  name?: string | null,
  email?: string | null
): boolean {
  const trimmed = name?.trim() ?? "";
  if (!trimmed) return true;
  if (trimmed.toLowerCase() === "usuario apple") return true;

  if (email) {
    const localPart = email.split("@")[0]?.trim().toLowerCase();
    if (localPart && trimmed.toLowerCase() === localPart) {
      return true;
    }
  }

  return false;
}

export function needsAppleProfileCompletion(user: {
  name?: string | null;
  email?: string | null;
}): boolean {
  return isLikelyApplePlaceholderName(user.name, user.email);
}

type Props = {
  visible: boolean;
  initialName?: string;
  initialEmail?: string;
  saving?: boolean;
  onClose?: () => void;
  onSave: (data: { name: string; email?: string }) => void | Promise<void>;
};

export default function CompleteAppleProfileModal({
  visible,
  initialName = "",
  initialEmail = "",
  saving = false,
  onClose,
  onSave,
}: Props) {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const isRelayEmail = isApplePrivateRelayEmail(initialEmail);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setName(
      isLikelyApplePlaceholderName(initialName, initialEmail)
        ? ""
        : initialName || ""
    );
    setEmail(isRelayEmail ? "" : initialEmail || "");
    setError(null);
  }, [visible, initialName, initialEmail, isRelayEmail]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError("Introduce tu nombre real (mínimo 2 caracteres).");
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (trimmedEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        setError("Introduce un correo electrónico válido.");
        return;
      }
    }

    setError(null);
    await onSave({
      name: trimmedName,
      email: trimmedEmail || undefined,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === "android"}
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.title, { color: theme.text }]}>
            Completa tu perfil
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Apple no compartió tu nombre completo. Indica cómo quieres
            aparecer en EvoFit.
          </Text>

          {isRelayEmail ? (
            <Text style={[styles.hint, { color: theme.textTertiary }]}>
              Tu correo está oculto con Apple Private Relay. Puedes dejarlo así
              o añadir un correo real (opcional).
            </Text>
          ) : null}

          <Text style={[styles.label, { color: theme.textSecondary }]}>
            Nombre
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                color: theme.text,
                backgroundColor: theme.inputBackground,
                borderColor: theme.inputBorder,
              },
            ]}
            value={name}
            onChangeText={setName}
            placeholder="Tu nombre"
            placeholderTextColor={theme.textTertiary}
            autoCapitalize="words"
            editable={!saving}
          />

          <Text style={[styles.label, { color: theme.textSecondary }]}>
            Email {isRelayEmail ? "(opcional)" : ""}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                color: theme.text,
                backgroundColor: theme.inputBackground,
                borderColor: theme.inputBorder,
              },
            ]}
            value={email}
            onChangeText={setEmail}
            placeholder={
              isRelayEmail
                ? "Tu correo real (opcional)"
                : initialEmail || "tu@email.com"
            }
            placeholderTextColor={theme.textTertiary}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!saving}
          />

          {error ? (
            <Text style={[styles.error, { color: theme.error }]}>{error}</Text>
          ) : null}

          <TouchableOpacity
            style={[
              styles.primaryButton,
              { backgroundColor: theme.primary, opacity: saving ? 0.7 : 1 },
            ]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Guardar</Text>
            )}
          </TouchableOpacity>

          {onClose ? (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onClose}
              disabled={saving}
            >
              <Text
                style={[styles.secondaryButtonText, { color: theme.textSecondary }]}
              >
                Ahora no
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (
  theme: { primary: string },
  _isDark: boolean
) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      padding: 24,
    },
    card: {
      borderRadius: 16,
      padding: 20,
    },
    title: {
      fontSize: 20,
      fontWeight: "700",
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 12,
    },
    hint: {
      fontSize: 12,
      lineHeight: 18,
      marginBottom: 12,
    },
    label: {
      fontSize: 13,
      fontWeight: "600",
      marginBottom: 6,
      marginTop: 8,
    },
    input: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
    },
    error: {
      marginTop: 10,
      fontSize: 13,
    },
    primaryButton: {
      marginTop: 18,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
    },
    primaryButtonText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 15,
    },
    secondaryButton: {
      marginTop: 10,
      alignItems: "center",
      paddingVertical: 8,
    },
    secondaryButtonText: {
      fontSize: 14,
      fontWeight: "600",
    },
  });
