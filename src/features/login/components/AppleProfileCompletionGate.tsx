import React, { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";
import { updateUserProfile } from "../services/authService";
import { useAuthStore } from "../../../store/useAuthStore";
import CompleteAppleProfileModal, {
  needsAppleProfileCompletion,
} from "./CompleteAppleProfileModal";

type CaughtError = {
  message?: string;
};

function getErrorMessage(error: CaughtError): string | undefined {
  return error?.message;
}

/**
 * Shows CompleteAppleProfileModal for Apple / Private Relay users whose
 * stored display name still looks like a placeholder or opaque Apple id.
 * "Ahora no" dismisses only for the current JS session (cold start re-shows).
 */
export default function AppleProfileCompletionGate() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const updateUser = useAuthStore((state) => state.updateUser);

  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dismissedThisSession, setDismissedThisSession] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user || dismissedThisSession) {
      setVisible(false);
      return;
    }

    setVisible(needsAppleProfileCompletion(user));
  }, [isAuthenticated, user, dismissedThisSession]);

  const handleClose = useCallback(() => {
    setDismissedThisSession(true);
    setVisible(false);
  }, []);

  const handleSave = useCallback(
    async (data: { name: string; email?: string }) => {
      if (!user?.id) return;

      try {
        setSaving(true);
        const updates: { name: string; email?: string } = { name: data.name };
        if (data.email) {
          updates.email = data.email;
        }

        const updatedUser = await updateUserProfile(user.id, updates);
        updateUser(updatedUser);
        setVisible(false);
        setDismissedThisSession(false);
      } catch (error) {
        const errorMessage = getErrorMessage(error as CaughtError);
        Alert.alert(
          "Error",
          errorMessage || "No se pudo guardar el perfil. Inténtalo de nuevo."
        );
      } finally {
        setSaving(false);
      }
    },
    [user?.id, updateUser]
  );

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <CompleteAppleProfileModal
      visible={visible}
      initialName={user.name}
      initialEmail={user.email}
      saving={saving}
      onClose={handleClose}
      onSave={handleSave}
    />
  );
}
