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

export interface HealthClient {
  isAvailable(): Promise<boolean>;
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
}
