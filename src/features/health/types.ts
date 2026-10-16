export type HealthMetricsSource =
  | "healthkit"
  | "health_connect"
  | "met_estimate"
  | "unavailable";

export type HealthAuthorizationStatus =
  | "unavailable"
  | "undetermined"
  | "granted"
  | "denied";

export interface WorkoutHealthSnapshot {
  heartRateBpm: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  caloriesBurned: number | null;
  source: HealthMetricsSource;
  lastUpdatedAt: number;
}

export type WriteWorkoutInput = {
  startMs: number;
  endMs: number;
  title: string;
  caloriesBurned?: number | null;
};

export type RestSummary = {
  sleepHoursLastNight: number | null;
  stepsLast7Days: number | null;
};

/** Provider readiness before requesting permissions (Android Health Connect). */
export type HealthProviderAvailability =
  | "available"
  | "update_required"
  | "unavailable";

export interface HealthClient {
  isAvailable(): Promise<boolean>;
  /**
   * Finer-grained provider readiness (install / update / ready).
   * Defaults to available/unavailable when the platform has no install step.
   */
  getProviderAvailability(): Promise<HealthProviderAvailability>;
  getAuthorizationStatus(): Promise<HealthAuthorizationStatus>;
  requestAuthorization(): Promise<HealthAuthorizationStatus>;
  /**
   * Read live-ish metrics for a workout window [startedAtMs, now].
   * Returns null fields when the hub has no samples yet.
   */
  getWorkoutMetrics(startedAtMs: number): Promise<{
    heartRateBpm: number | null;
    avgHeartRate: number | null;
    maxHeartRate: number | null;
    caloriesBurned: number | null;
  } | null>;
  /** Write a completed strength workout to the system health hub. */
  writeWorkout(input: WriteWorkoutInput): Promise<boolean>;
  /** Optional rest signals from sleep + steps (best-effort). */
  getRestSummary(): Promise<RestSummary>;
  /** Open system Health Connect / Salud permission management (Hevy Manage). */
  openManagePermissions(): Promise<boolean>;
  /** Open Play Store to install/update Health Connect when missing. */
  openInstallProvider(): Promise<boolean>;
}
