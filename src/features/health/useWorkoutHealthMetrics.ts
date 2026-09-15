import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus, Platform } from "react-native";
import { useNutritionStore } from "../../store/useNutritionStore";
import { getHealthClient } from "./healthClient";
import { estimateCaloriesFromMet } from "./metEstimate";
import type { HealthMetricsSource, WorkoutHealthSnapshot } from "./types";
import { useHealthConnectionStore } from "./useHealthConnectionStore";

/** Live hub polling while the workout is in the foreground. */
const HUB_POLL_MS = 10_000;
/** MET-only / no hub: kcal only drifts with duration — poll less often. */
const MET_POLL_MS = 30_000;

const emptySnapshot = (
  source: HealthMetricsSource = "unavailable"
): WorkoutHealthSnapshot => ({
  heartRateBpm: null,
  avgHeartRate: null,
  maxHeartRate: null,
  caloriesBurned: null,
  source,
  lastUpdatedAt: Date.now(),
});

function snapshotsEqual(
  a: WorkoutHealthSnapshot,
  b: WorkoutHealthSnapshot
): boolean {
  return (
    a.heartRateBpm === b.heartRateBpm &&
    a.avgHeartRate === b.avgHeartRate &&
    a.maxHeartRate === b.maxHeartRate &&
    a.caloriesBurned === b.caloriesBurned &&
    a.source === b.source
  );
}

function pollIntervalForStatus(
  status: string,
  appState: AppStateStatus
): number | null {
  // Stop native/JS polling while backgrounded — saves battery & HealthKit/HC wakeups.
  if (appState !== "active") return null;
  if (status === "granted" || status === "undetermined") return HUB_POLL_MS;
  return MET_POLL_MS;
}

/**
 * Polls HealthKit / Health Connect during an active workout.
 * Falls back to MET estimate for calories when the hub has no energy data.
 */
export function useWorkoutHealthMetrics(options: {
  enabled: boolean;
  getStartTime: () => number;
  getDurationSeconds: () => number;
}) {
  const { enabled, getStartTime, getDurationSeconds } = options;
  const authStatus = useHealthConnectionStore((s) => s.status);
  const weightRaw =
    useNutritionStore((s) => s.userProfile?.anthropometrics?.weight) ?? 0;
  const weightUnit = useNutritionStore(
    (s) => s.userProfile?.preferences?.weightUnit
  );
  const weightKg =
    String(weightUnit).toLowerCase() === "lbs"
      ? Number(weightRaw) * 0.453592
      : Number(weightRaw);

  const [snapshot, setSnapshot] = useState<WorkoutHealthSnapshot>(
    emptySnapshot()
  );

  // Running HR stats — O(1) memory instead of unbounded sample arrays.
  const hrStatsRef = useRef({ count: 0, sum: 0, max: 0 });
  const inFlightRef = useRef(false);
  const availableCacheRef = useRef<boolean | null>(null);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  const enabledRef = useRef(enabled);
  const authStatusRef = useRef(authStatus);
  const weightKgRef = useRef(weightKg);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  enabledRef.current = enabled;
  authStatusRef.current = authStatus;
  weightKgRef.current = weightKg;

  const commitSnapshot = useCallback((next: WorkoutHealthSnapshot) => {
    if (snapshotsEqual(snapshotRef.current, next)) return;
    setSnapshot({ ...next, lastUpdatedAt: Date.now() });
  }, []);

  const sample = useCallback(async () => {
    if (inFlightRef.current) return;
    // Never hit the hub while backgrounded.
    if (appStateRef.current !== "active") return;
    inFlightRef.current = true;

    try {
      const isEnabled = enabledRef.current;
      const status = authStatusRef.current;
      const kg = weightKgRef.current;
      const startedAtMs = getStartTime();
      const duration = getDurationSeconds();
      // Quantize MET kcal to 5s so the strip does not re-render every poll for +1 kcal drift.
      const rawMet = estimateCaloriesFromMet({
        weightKg: Number(kg) || 0,
        durationSeconds: duration,
      });
      const metCalories =
        rawMet > 0 ? Math.max(5, Math.round(rawMet / 5) * 5) : 0;

      if (!isEnabled) {
        hrStatsRef.current = { count: 0, sum: 0, max: 0 };
        availableCacheRef.current = null;
        commitSnapshot(emptySnapshot("unavailable"));
        return;
      }

      const platformSource: HealthMetricsSource =
        Platform.OS === "ios"
          ? "healthkit"
          : Platform.OS === "android"
            ? "health_connect"
            : "unavailable";

      if (status !== "granted" && status !== "undetermined") {
        commitSnapshot({
          ...emptySnapshot("met_estimate"),
          caloriesBurned: metCalories || null,
          source: metCalories > 0 ? "met_estimate" : "unavailable",
        });
        return;
      }

      try {
        const client = getHealthClient();
        let available = availableCacheRef.current;
        if (available === null) {
          available = await client.isAvailable();
          availableCacheRef.current = available;
        }

        if (!available) {
          commitSnapshot({
            ...emptySnapshot("met_estimate"),
            caloriesBurned: metCalories || null,
            source: metCalories > 0 ? "met_estimate" : "unavailable",
          });
          return;
        }

        const metrics = await client.getWorkoutMetrics(startedAtMs);
        const heartRateBpm = metrics?.heartRateBpm ?? null;

        if (heartRateBpm != null && heartRateBpm > 0) {
          const stats = hrStatsRef.current;
          stats.count += 1;
          stats.sum += heartRateBpm;
          stats.max = Math.max(stats.max, heartRateBpm);
        }

        const stats = hrStatsRef.current;
        const avgFromSamples = stats.count
          ? Math.round(stats.sum / stats.count)
          : null;
        const maxFromSamples = stats.count ? Math.round(stats.max) : null;

        const hubCalories = metrics?.caloriesBurned ?? null;
        const hasHubSignal =
          heartRateBpm != null ||
          hubCalories != null ||
          metrics?.avgHeartRate != null;

        commitSnapshot({
          heartRateBpm,
          avgHeartRate: metrics?.avgHeartRate ?? avgFromSamples,
          maxHeartRate: metrics?.maxHeartRate ?? maxFromSamples,
          caloriesBurned: hubCalories ?? (metCalories || null),
          source: hasHubSignal
            ? platformSource
            : metCalories > 0
              ? "met_estimate"
              : "unavailable",
          lastUpdatedAt: Date.now(),
        });
      } catch {
        commitSnapshot({
          ...emptySnapshot("met_estimate"),
          caloriesBurned: metCalories || null,
          source: metCalories > 0 ? "met_estimate" : "unavailable",
        });
      }
    } finally {
      inFlightRef.current = false;
    }
  }, [commitSnapshot, getDurationSeconds, getStartTime]);

  useEffect(() => {
    if (!enabled) {
      hrStatsRef.current = { count: 0, sum: 0, max: 0 };
      availableCacheRef.current = null;
      commitSnapshot(emptySnapshot());
      return;
    }

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const clearPoll = () => {
      if (intervalId != null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const startPoll = () => {
      clearPoll();
      const ms = pollIntervalForStatus(
        authStatusRef.current,
        appStateRef.current
      );
      if (ms == null) return;
      intervalId = setInterval(() => {
        void sample();
      }, ms);
    };

    void sample();
    startPoll();

    const sub = AppState.addEventListener("change", (next) => {
      appStateRef.current = next;
      if (next === "active") {
        // Re-check availability after returning from background / Health settings.
        availableCacheRef.current = null;
        void sample();
        startPoll();
      } else {
        clearPoll();
      }
    });

    return () => {
      clearPoll();
      sub.remove();
    };
  }, [commitSnapshot, enabled, sample, authStatus]);

  return snapshot;
}
