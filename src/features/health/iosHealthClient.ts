import type {
  HealthAuthorizationStatus,
  HealthClient,
  RestSummary,
  WriteWorkoutInput,
} from "./types";

const READ_TYPES = [
  "heartRate",
  "activeEnergyBurned",
  "sleepAnalysis",
  "stepCount",
] as const;

const WRITE_TYPES = ["activeEnergyBurned", "workoutType"] as const;

function toNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

type AppleHealthModule = {
  default?: { isAvailableAsync?: () => Promise<boolean> };
  HealthKitQuery: new () => {
    type: (id: string, kind?: string) => any;
    dateRange: (start?: Date, end?: Date) => any;
    limit: (n: number) => any;
    ascending: (asc: boolean) => any;
    aggregations: (aggs: string[]) => any;
    execute: () => Promise<any>;
    executeStatistics: () => Promise<any>;
  };
  HealthKitSampleBuilder: new () => {
    workoutType: (t: string) => any;
    startDate: (d: Date) => any;
    endDate: (d: Date) => any;
    totalEnergyBurned: (kcal: number) => any;
    metadata: (data: Record<string, unknown>) => any;
    save: () => Promise<unknown>;
  };
};

let cachedModule: AppleHealthModule | null | undefined;

function loadAppleHealth(): AppleHealthModule | null {
  if (cachedModule !== undefined) return cachedModule;
  try {
    cachedModule = require("apple-health") as AppleHealthModule;
    return cachedModule;
  } catch {
    cachedModule = null;
    return null;
  }
}

/**
 * Apple HealthKit adapter via `apple-health`.
 */
export function createIosHealthClient(): HealthClient {
  let availableCache: boolean | null = null;

  return {
    async isAvailable() {
      if (availableCache != null) return availableCache;
      try {
        const mod = loadAppleHealth();
        if (!mod) {
          availableCache = false;
          return false;
        }
        const AppleHealth = mod.default;
        if (typeof AppleHealth?.isAvailableAsync === "function") {
          availableCache = Boolean(await AppleHealth.isAvailableAsync());
          return availableCache;
        }
        availableCache = true;
        return true;
      } catch {
        availableCache = false;
        return false;
      }
    },

    async getAuthorizationStatus(): Promise<HealthAuthorizationStatus> {
      try {
        const { getPermissionsAsync, PermissionStatus } = require("apple-health/hooks");
        const status = await getPermissionsAsync({
          read: [...READ_TYPES],
          write: [...WRITE_TYPES],
        });
        if (status?.status === PermissionStatus.GRANTED) return "granted";
        if (status?.status === PermissionStatus.DENIED) return "denied";
        return "undetermined";
      } catch {
        return "unavailable";
      }
    },

    async requestAuthorization(): Promise<HealthAuthorizationStatus> {
      try {
        const { requestPermissionsAsync, PermissionStatus } = require("apple-health/hooks");
        const status = await requestPermissionsAsync({
          read: [...READ_TYPES],
          write: [...WRITE_TYPES],
        });
        availableCache = null;
        if (status?.status === PermissionStatus.GRANTED) return "granted";
        if (status?.status === PermissionStatus.DENIED) return "denied";
        return "granted";
      } catch {
        return "unavailable";
      }
    },

    async getWorkoutMetrics(startedAtMs: number) {
      try {
        const mod = loadAppleHealth();
        if (!mod?.HealthKitQuery) return null;

        const { HealthKitQuery } = mod;
        const start = new Date(startedAtMs);
        const end = new Date();

        // Only latest HR + energy sum. Avg/max come from the JS running stats
        // in useWorkoutHealthMetrics — saves one HealthKit statistics query per poll.
        const [latestSamples, energyStats] = await Promise.all([
          new HealthKitQuery()
            .type("heartRate", "quantity")
            .dateRange(start, end)
            .limit(1)
            .ascending(false)
            .execute(),
          new HealthKitQuery()
            .type("activeEnergyBurned", "statistics")
            .dateRange(start, end)
            .aggregations(["sum"])
            .executeStatistics(),
        ]);

        const latest = Array.isArray(latestSamples) ? latestSamples[0] : null;
        const heartRateBpm = toNumber(latest?.value);
        const caloriesBurned = toNumber(
          energyStats?.sumQuantity ??
            energyStats?.sum ??
            (Array.isArray(energyStats) ? energyStats[0]?.sumQuantity : null)
        );

        return {
          heartRateBpm: heartRateBpm != null ? Math.round(heartRateBpm) : null,
          avgHeartRate: null,
          maxHeartRate: null,
          caloriesBurned:
            caloriesBurned != null ? Math.round(caloriesBurned) : null,
        };
      } catch {
        return null;
      }
    },

    async writeWorkout(input: WriteWorkoutInput) {
      try {
        const mod = loadAppleHealth();
        if (!mod?.HealthKitSampleBuilder) return false;
        const start = new Date(input.startMs);
        const end = new Date(Math.max(input.endMs, input.startMs + 60_000));
        let builder = new mod.HealthKitSampleBuilder()
          .workoutType("traditionalStrengthTraining")
          .startDate(start)
          .endDate(end)
          .metadata({
            HKWorkoutBrandName: "EvoFit",
            title: input.title,
          });
        if (input.caloriesBurned != null && input.caloriesBurned > 0) {
          builder = builder.totalEnergyBurned(Math.round(input.caloriesBurned));
        }
        await builder.save();
        return true;
      } catch {
        return false;
      }
    },

    async getRestSummary(): Promise<RestSummary> {
      const empty: RestSummary = {
        sleepHoursLastNight: null,
        stepsLast7Days: null,
      };
      try {
        const mod = loadAppleHealth();
        if (!mod?.HealthKitQuery) return empty;

        const now = new Date();
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const [sleepSamples, stepsStats] = await Promise.all([
          new mod.HealthKitQuery()
            .type("sleepAnalysis", "category")
            .dateRange(dayAgo, now)
            .limit(50)
            .execute()
            .catch(() => []),
          new mod.HealthKitQuery()
            .type("stepCount", "statistics")
            .dateRange(weekAgo, now)
            .aggregations(["sum"])
            .executeStatistics()
            .catch(() => null),
        ]);

        let sleepMs = 0;
        for (const sample of Array.isArray(sleepSamples) ? sleepSamples : []) {
          const start = sample?.startDate
            ? new Date(sample.startDate).getTime()
            : NaN;
          const end = sample?.endDate
            ? new Date(sample.endDate).getTime()
            : NaN;
          if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
            // categoryValue: typically >0 means asleep variants
            const value = Number(sample?.value ?? sample?.categoryValue ?? 1);
            if (value > 0) sleepMs += end - start;
          }
        }

        const steps = toNumber(
          stepsStats?.sumQuantity ??
            stepsStats?.sum ??
            (Array.isArray(stepsStats) ? stepsStats[0]?.sumQuantity : null)
        );

        return {
          sleepHoursLastNight:
            sleepMs > 0 ? Math.round((sleepMs / 3_600_000) * 10) / 10 : null,
          stepsLast7Days: steps != null ? Math.round(steps) : null,
        };
      } catch {
        return empty;
      }
    },
  };
}
