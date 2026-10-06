import { Heart, Watch } from "lucide-react-native";
import React, { useMemo, useState } from "react";
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
import { getHealthConnectionPresentation } from "../healthConnectionCopy";
import type { RestSummary } from "../types";
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

  const status = useHealthConnectionStore((state) => state.status);
  const hasRequestedAuthorization = useHealthConnectionStore(
    (state) => state.hasRequestedAuthorization
  );
  const connect = useHealthConnectionStore((state) => state.connect);
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

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const nextStatus = await connect();
      if (nextStatus === "unavailable") {
        Alert.alert(copy.unavailableAlertTitle, copy.unavailableBody);
      } else if (nextStatus === "denied") {
        Alert.alert(copy.deniedAlertTitle, copy.deniedBody);
      }
    } finally {
      setIsConnecting(false);
    }
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

        <TouchableOpacity
          style={[
            styles.settingRow,
            styles.settingRowBorder,
            { borderBottomColor: theme.divider },
          ]}
          onPress={() => void handleConnect()}
          disabled={isConnecting}
          accessibilityRole="button"
          testID="health-connect-row"
        >
          <View
            style={[
              styles.settingIconContainer,
              { backgroundColor: theme.error + "20" },
            ]}
          >
            <Watch color={theme.error} size={20} />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, { color: theme.text }]}>
              {copy.connectTitle}
            </Text>
            <Text
              style={[styles.settingSubtitle, { color: theme.textSecondary }]}
            >
              {copy.statusSubtitle}
            </Text>
          </View>
          {isConnecting ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : null}
        </TouchableOpacity>

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
              style={[styles.settingSubtitle, { color: theme.textSecondary }]}
            >
              {copy.writeSubtitle}
            </Text>
          </View>
          <Switch
            value={writeWorkoutsToHub}
            onValueChange={setWriteWorkoutsToHub}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor="#fff"
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
              style={[styles.settingSubtitle, { color: theme.textSecondary }]}
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

        <View style={styles.notesRow}>
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
  noteText: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 6,
  },
});
