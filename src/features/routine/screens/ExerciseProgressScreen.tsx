import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import {
  themeBarStyle,
  useFocusedStatusBar,
} from "../../../hooks/useFocusedStatusBar";
import { AppRefreshControl } from "../../common/components/AppRefreshControl";
import { ScreenHeader } from "../../common/components/ScreenHeader";
import {
  EXERCISE_ANALYSIS_PERIODS,
  EXERCISE_ANALYSIS_PERIOD_LABELS,
  calculateProgressStats,
  compareWithPreviousPeriod,
  filterByPeriod,
  metricDeltaFromComparison,
  normalizeExerciseAnalysisPeriod,
  type ExerciseAnalysisPeriod,
} from "../../../utils/statsHelpers";
import { ExerciseMetricSummaryRow } from "../components/ExerciseMetricSummaryRow";
import { ExerciseProgressChart } from "../components/ExerciseProgressChart";
import { ExerciseProgressSkeleton } from "../components/ExerciseProgressSkeleton";
import { ExerciseSessionStatus } from "../components/ExerciseSessionStatus";
import { useExerciseSessionHistory } from "../hooks/useExerciseSessionHistory";
import {
  STALE_REFRESH_COPY,
  comparisonCaption,
  heroInsight,
  oneRmNote,
  type ProgressMetric,
} from "../utils/exerciseProgressCopy";
import { WorkoutStackParamList } from "./WorkoutStack";

type Props = NativeStackScreenProps<WorkoutStackParamList, "ExerciseProgress">;

export default function ExerciseProgressScreen({ route, navigation }: Props) {
  const { exercise, period: routePeriod } = route.params;
  const { theme, isDark } = useTheme();
  useFocusedStatusBar(themeBarStyle(isDark));
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const {
    allProgressData,
    loading,
    refreshing,
    error,
    staleError,
    refresh,
    retry,
  } = useExerciseSessionHistory(exercise.id);

  const [selectedPeriod, setSelectedPeriod] = useState<ExerciseAnalysisPeriod>(
    () => normalizeExerciseAnalysisPeriod(routePeriod)
  );
  const [metric, setMetric] = useState<ProgressMetric>("weight");

  useEffect(() => {
    setSelectedPeriod(normalizeExerciseAnalysisPeriod(routePeriod));
  }, [routePeriod]);

  const progressData = useMemo(
    () => filterByPeriod(allProgressData, selectedPeriod),
    [allProgressData, selectedPeriod]
  );

  const stats = useMemo(
    () => calculateProgressStats(progressData),
    [progressData]
  );

  const comparison = useMemo(
    () => compareWithPreviousPeriod(allProgressData, selectedPeriod),
    [allProgressData, selectedPeriod]
  );

  const delta = metricDeltaFromComparison(comparison, metric);

  const body = () => {
    if (error) {
      return (
        <ExerciseSessionStatus variant="unavailable" onAction={() => void retry()} />
      );
    }

    if (allProgressData.length === 0) {
      return <ExerciseSessionStatus variant="empty-exercise" />;
    }

    if (progressData.length === 0) {
      return (
        <ExerciseSessionStatus
          variant="empty-period"
          onAction={() => {
            void Haptics.selectionAsync();
            setSelectedPeriod(0);
          }}
        />
      );
    }

    return (
      <>
        <Text style={styles.hero}>{heroInsight(stats)}</Text>

        <ExerciseMetricSummaryRow
          stats={stats}
          metric={metric}
          onSelect={setMetric}
        />

        <ExerciseProgressChart
          points={progressData}
          metric={metric}
          onSelectMetric={setMetric}
        />

        <Text style={styles.comparison}>
          {comparisonCaption(selectedPeriod, delta)}
        </Text>

        {metric === "oneRm" ? (
          <Text style={styles.oneRmNote}>{oneRmNote()}</Text>
        ) : null}
      </>
    );
  };

  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      style={[styles.safeArea, { paddingTop: insets.top }]}
    >
      <ScreenHeader
        title={exercise.name?.trim() || "Ejercicio"}
        subtitle="Progreso"
        onBack={() => navigation.goBack()}
      />

      {loading ? (
        <ExerciseProgressSkeleton />
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          refreshControl={
            <AppRefreshControl
              refreshing={refreshing}
              onRefresh={() => void refresh()}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {staleError ? (
            <View style={styles.staleBanner}>
              <Text style={styles.staleText}>{STALE_REFRESH_COPY}</Text>
            </View>
          ) : null}

          {!error ? (
            <View style={styles.periodRow}>
              {EXERCISE_ANALYSIS_PERIODS.map((period) => {
                const active = selectedPeriod === period;
                return (
                  <TouchableOpacity
                    key={period}
                    style={[styles.periodChip, active && styles.periodChipActive]}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setSelectedPeriod(period);
                    }}
                  >
                    <Text
                      style={[
                        styles.periodChipText,
                        active && styles.periodChipTextActive,
                      ]}
                    >
                      {EXERCISE_ANALYSIS_PERIOD_LABELS[period]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          {body()}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    container: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 32,
      gap: 12,
    },
    periodRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    periodChip: {
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: theme.backgroundSecondary,
      borderWidth: 1,
      borderColor: theme.border,
    },
    periodChipActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    periodChipText: {
      color: theme.textSecondary,
      fontSize: 13,
      fontWeight: "600",
    },
    periodChipTextActive: {
      color: theme.onPrimary,
      fontWeight: "700",
    },
    hero: {
      color: theme.text,
      fontSize: 18,
      fontWeight: "700",
      lineHeight: 24,
    },
    comparison: {
      color: theme.textSecondary,
      fontSize: 13,
      textAlign: "center",
      fontVariant: ["tabular-nums"],
    },
    oneRmNote: {
      color: theme.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      backgroundColor: theme.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 12,
    },
    staleBanner: {
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.warning,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    staleText: {
      color: theme.text,
      fontSize: 13,
      lineHeight: 18,
    },
  });
