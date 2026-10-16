import {
  CheckCircle2,
  Download,
  Heart,
  Settings2,
  Watch,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../../../contexts/ThemeContext";
import { getHealthClient } from "../healthClient";
import { getHealthConnectionPresentation } from "../healthConnectionCopy";
import type { HealthProviderAvailability, RestSummary } from "../types";
import { useHealthConnectionStore } from "../useHealthConnectionStore";
import { getRestSummaryCached } from "../insightsCache";

type Props = {
  restSummary: RestSummary | null;
  onRestSummaryChange: (summary: RestSummary | null) => void;
};

export function HealthConnectionSection({
  restSummary,
  onRestSummaryChange,
}: Props) {
  const { theme } = useTheme();
  const [isConnecting, setIsConnecting] = useState(false);
  const [providerAvailability, setProviderAvailability] =
    useState<HealthProviderAvailability | null>(null);

  const status = useHealthConnectionStore((state) => state.status);
  const hasRequestedAuthorization = useHealthConnectionStore(
    (state) => state.hasRequestedAuthorization
  );
  const connect = useHealthConnectionStore((state) => state.connect);
  const disconnect = useHealthConnectionStore((state) => state.disconnect);
  const writeWorkoutsToHub = useHealthConnectionStore(
    (state) => state.writeWorkoutsToHub
  );
  const setWriteWorkoutsToHub = useHealthConnectionStore(
    (state) => state.setWriteWorkoutsToHub
  );
  const showRestHints = useHealthConnectionStore((state) => state.showRestHints);
  const setShowRestHints = useHealthConnectionStore(
    (state) => state.setShowRestHints
  );

  const copy = useMemo(
    () =>
      getHealthConnectionPresentation({
        platform: Platform.OS,
        status,
        hasRequestedAuthorization,
        isConnecting,
      }),
    [status, hasRequestedAuthorization, isConnecting]
  );

  useEffect(() => {
    let cancelled = false;
    void getHealthClient()
      .getProviderAvailability()
      .then((availability) => {
        if (!cancelled) setProviderAvailability(availability);
      })
      .catch(() => {
        if (!cancelled) setProviderAvailability("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [status, hasRequestedAuthorization]);

  const needsProviderInstall =
    Platform.OS === "android" &&
    (providerAvailability === "unavailable" ||
      providerAvailability === "update_required" ||
      status === "unavailable");

  const refreshProviderAvailability = async () => {
    try {
      const availability = await getHealthClient().getProviderAvailability();
      setProviderAvailability(availability);
      return availability;
    } catch {
      setProviderAvailability("unavailable");
      return "unavailable" as const;
    }
  };

  const handleInstallProvider = async () => {
    const opened = await getHealthClient().openInstallProvider();
    if (!opened) {
      Alert.alert(copy.installAlertTitle, copy.unavailableBody);
      return;
    }
    Alert.alert(
      copy.installAlertTitle,
      "Cuando Health Connect esté instalado o actualizado, vuelve aquí y toca Conectar."
    );
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const availability = await refreshProviderAvailability();
      if (
        Platform.OS === "android" &&
        (availability === "unavailable" || availability === "update_required")
      ) {
        Alert.alert(copy.installAlertTitle, copy.installAlertBody, [
          { text: "Cancelar", style: "cancel" },
          {
            text: copy.installAlertAction,
            onPress: () => {
              void handleInstallProvider();
            },
          },
        ]);
        return;
      }

      const nextStatus = await connect();
      if (nextStatus === "unavailable") {
        if (Platform.OS === "android") {
          Alert.alert(copy.unavailableAlertTitle, copy.unavailableBody, [
            { text: "Cancelar", style: "cancel" },
            {
              text: copy.installAlertAction,
              onPress: () => {
                void handleInstallProvider();
              },
            },
          ]);
        } else {
          Alert.alert(copy.unavailableAlertTitle, copy.unavailableBody);
        }
      } else if (nextStatus === "denied") {
        Alert.alert(copy.deniedAlertTitle, copy.deniedBody, [
          { text: "Cancelar", style: "cancel" },
          {
            text: copy.manageTitle,
            onPress: () => {
              void getHealthClient().openManagePermissions();
            },
          },
        ]);
      } else {
        Alert.alert(copy.connectSuccessTitle, copy.connectSuccessBody);
        void getRestSummaryCached({ force: true }).then((summary) => {
          onRestSummaryChange(summary);
        });
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSyncToggle = (value: boolean) => {
    if (!value) {
      setWriteWorkoutsToHub(false);
      return;
    }
    if (!copy.showConnectedControls) {
      void handleConnect();
      return;
    }
    setWriteWorkoutsToHub(true);
  };

  const handleManage = () => {
    void getHealthClient().openManagePermissions();
  };

  const handleDisconnect = () => {
    Alert.alert(
      copy.disconnectTitle,
      Platform.OS === "ios"
        ? "EvoFit dejará de sincronizar entrenos. Los permisos en Ajustes > Salud no se revocan solos: puedes desactivarlos allí si quieres."
        : "EvoFit dejará de sincronizar entrenos. Usa Gestionar en Health Connect si también quieres revocar permisos.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: copy.disconnectTitle,
          style: "destructive",
          onPress: () => {
            disconnect();
            onRestSummaryChange(null);
          },
        },
      ]
    );
  };

  const restSubtitle = (() => {
    if (!showRestHints) return copy.restIdleSubtitle;
    if (!restSummary) return copy.restIdleSubtitle;
    const parts = [
      restSummary.sleepHoursLastNight != null
        ? `Sueño ~${restSummary.sleepHoursLastNight} h`
        : null,
      restSummary.stepsLast7Days != null
        ? `${restSummary.stepsLast7Days.toLocaleString("es-ES")} pasos (7d)`
        : null,
    ].filter(Boolean);
    return parts.length > 0
      ? parts.join(" · ")
      : "Sin datos de sueño/pasos todavía";
  })();

  const installCtaLabel =
    providerAvailability === "update_required"
      ? "Actualizar Health Connect"
      : copy.installTitle;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
        {copy.sectionTitle}
      </Text>

      <View
        style={[
          styles.settingsGroup,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <View
          style={[
            styles.explainerRow,
            styles.settingRowBorder,
            { borderBottomColor: theme.divider },
          ]}
        >
          <Text style={[styles.explainerText, { color: theme.textSecondary }]}>
            {copy.explainer}
          </Text>
        </View>

        {!copy.showConnectedControls ? (
          <>
            {needsProviderInstall ? (
              <TouchableOpacity
                style={[
                  styles.connectCta,
                  {
                    backgroundColor: theme.card,
                    borderWidth: 1,
                    borderColor: theme.primary,
                  },
                ]}
                onPress={() => void handleInstallProvider()}
                accessibilityRole="button"
                testID="health-install-row"
              >
                <Download color={theme.primary} size={20} />
                <Text style={[styles.connectCtaText, { color: theme.primary }]}>
                  {installCtaLabel}
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[
                styles.connectCta,
                {
                  backgroundColor: theme.primary,
                  opacity: isConnecting ? 0.7 : 1,
                  marginTop: needsProviderInstall ? 8 : 12,
                },
              ]}
              onPress={() => void handleConnect()}
              disabled={isConnecting}
              accessibilityRole="button"
              testID="health-connect-row"
            >
              {isConnecting ? (
                <ActivityIndicator size="small" color={theme.onPrimary} />
              ) : (
                <Watch color={theme.onPrimary} size={20} />
              )}
              <Text style={[styles.connectCtaText, { color: theme.onPrimary }]}>
                {copy.connectTitle}
              </Text>
            </TouchableOpacity>
            <View style={styles.connectHintRow}>
              <Text
                style={[styles.connectHintText, { color: theme.textSecondary }]}
              >
                {needsProviderInstall
                  ? copy.installSubtitle || copy.connectHint
                  : copy.connectHint}
              </Text>
            </View>
          </>
        ) : (
          <>
            <View
              style={[
                styles.settingRow,
                styles.settingRowBorder,
                { borderBottomColor: theme.divider },
              ]}
              testID="health-connected-row"
            >
              <View
                style={[
                  styles.settingIconContainer,
                  { backgroundColor: theme.success + "20" },
                ]}
              >
                <CheckCircle2 color={theme.success} size={20} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: theme.text }]}>
                  {copy.connectTitle.replace(/^Conectar\s+/i, "")}
                </Text>
                <Text
                  style={[
                    styles.settingSubtitle,
                    { color: theme.textSecondary },
                  ]}
                >
                  {copy.statusSubtitle}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.settingRow,
                styles.settingRowBorder,
                { borderBottomColor: theme.divider },
              ]}
            >
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: theme.text }]}>
                  {copy.writeTitle}
                </Text>
                <Text
                  style={[
                    styles.settingSubtitle,
                    { color: theme.textSecondary },
                  ]}
                >
                  {copy.writeSubtitle}
                </Text>
              </View>
              <Switch
                value={writeWorkoutsToHub}
                onValueChange={handleSyncToggle}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#fff"
                testID="health-sync-switch"
              />
            </View>

            <View
              style={[
                styles.settingRow,
                styles.settingRowBorder,
                { borderBottomColor: theme.divider },
              ]}
            >
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: theme.text }]}>
                  {copy.restTitle}
                </Text>
                <Text
                  style={[
                    styles.settingSubtitle,
                    { color: theme.textSecondary },
                  ]}
                >
                  {restSubtitle}
                </Text>
              </View>
              <Switch
                value={showRestHints}
                onValueChange={(value) => {
                  setShowRestHints(value);
                  if (!value) {
                    onRestSummaryChange(null);
                    return;
                  }
                  void getRestSummaryCached({ force: true }).then(
                    onRestSummaryChange
                  );
                }}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#fff"
              />
            </View>

            <TouchableOpacity
              style={[
                styles.settingRow,
                styles.settingRowBorder,
                { borderBottomColor: theme.divider },
              ]}
              onPress={handleManage}
              accessibilityRole="button"
              testID="health-manage-row"
            >
              <View
                style={[
                  styles.settingIconContainer,
                  { backgroundColor: theme.info + "20" },
                ]}
              >
                <Settings2 color={theme.info} size={18} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: theme.text }]}>
                  {copy.manageTitle}
                </Text>
                {copy.manageSubtitle ? (
                  <Text
                    style={[
                      styles.settingSubtitle,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {copy.manageSubtitle}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingRow}
              onPress={handleDisconnect}
              accessibilityRole="button"
              testID="health-disconnect-row"
            >
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: theme.error }]}>
                  {copy.disconnectTitle}
                </Text>
              </View>
            </TouchableOpacity>
          </>
        )}

        <View
          style={[
            styles.notesRow,
            styles.notesTopBorder,
            { borderTopColor: theme.divider },
          ]}
        >
          <View
            style={[
              styles.settingIconContainer,
              { backgroundColor: theme.info + "20" },
            ]}
          >
            <Heart color={theme.info} size={18} />
          </View>
          <View style={styles.settingContent}>
            {copy.watchNotes.map((note) => (
              <Text
                key={note}
                style={[styles.noteText, { color: theme.textSecondary }]}
              >
                • {note}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  settingsGroup: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  explainerRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  explainerText: {
    fontSize: 13,
    lineHeight: 18,
  },
  connectCta: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  connectCtaText: {
    fontSize: 16,
    fontWeight: "700",
  },
  connectHintRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
  },
  connectHintText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  settingRowBorder: {
    borderBottomWidth: 1,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  notesRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
  },
  notesTopBorder: {
    borderTopWidth: 1,
  },
  noteText: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 6,
  },
});
