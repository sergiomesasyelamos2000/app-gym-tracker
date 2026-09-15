import type {
  HealthAuthorizationStatus,
  HealthClient,
  RestSummary,
  WriteWorkoutInput,
} from "./types";

const PERMISSIONS = [
  { accessType: "read", recordType: "HeartRate" },
  { accessType: "read", recordType: "ActiveCaloriesBurned" },
  { accessType: "read", recordType: "SleepSession" },
  { accessType: "read", recordType: "Steps" },
  { accessType: "write", recordType: "ExerciseSession" },
  { accessType: "write", recordType: "ActiveCaloriesBurned" },
] as const;

function toNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function extractKilocalories(energy: unknown): number | null {
  if (energy == null) return null;
  if (typeof energy === "number") return energy;
  if (typeof energy === "object") {
    const obj = energy as {
      inKilocalories?: number;
      inCalories?: number;
    };
    if (typeof obj.inKilocalories === "number") return obj.inKilocalories;
    if (typeof obj.inCalories === "number") return obj.inCalories / 1000;
  }
  return toNumber(energy);
}

/**
 * Android Health Connect adapter via `react-native-health-connect`.
 */
export function createAndroidHealthClient(): HealthClient {
  let initialized = false;
  let availableCache: boolean | null = null;
  let HC: typeof import("react-native-health-connect") | null = null;

  function loadHC() {
    if (HC) return HC;
    HC = require("react-native-health-connect");
    return HC;
  }

  async function ensureInit(): Promise<boolean> {
    if (availableCache === false) return false;
    if (initialized && availableCache === true) return true;

    try {
      const mod = loadHC();
      if (!mod) {
        availableCache = false;
        return false;
      }
      const status = await mod.getSdkStatus();
      const available =
        status === 3 || status === mod.SdkAvailabilityStatus?.SDK_AVAILABLE;
      if (!available) {
        availableCache = false;
        return false;
      }
      if (!initialized) {
        initialized = Boolean(await mod.initialize());
      }
      availableCache = initialized;
      return initialized;
    } catch {
      availableCache = false;
      return false;
    }
  }

  return {
    async isAvailable() {
      return ensureInit();
    },

    async getAuthorizationStatus(): Promise<HealthAuthorizationStatus> {
      try {
        if (!(await ensureInit())) return "unavailable";
        const mod = loadHC()!;
        const granted = await mod.getGrantedPermissions();
        const hasAny = granted?.some(
          (p: { recordType?: string }) =>
            p.recordType === "HeartRate" ||
            p.recordType === "ActiveCaloriesBurned" ||
            p.recordType === "ExerciseSession"
        );
        if (hasAny) return "granted";
        return "undetermined";
      } catch {
        return "unavailable";
      }
    },

    async requestAuthorization(): Promise<HealthAuthorizationStatus> {
      try {
        availableCache = null;
        if (!(await ensureInit())) return "unavailable";
        const mod = loadHC()!;
        const granted = await mod.requestPermission([...PERMISSIONS]);
        const ok = granted?.some(
          (p: { recordType?: string }) =>
            p.recordType === "HeartRate" ||
            p.recordType === "ActiveCaloriesBurned" ||
            p.recordType === "ExerciseSession" ||
            p.recordType === "SleepSession" ||
            p.recordType === "Steps"
        );
        return ok ? "granted" : "denied";
      } catch {
        return "unavailable";
      }
    },

    async getWorkoutMetrics(startedAtMs: number) {
      try {
        if (!(await ensureInit())) return null;
        const mod = loadHC()!;
        const timeRangeFilter = {
          operator: "between" as const,
          startTime: new Date(startedAtMs).toISOString(),
          endTime: new Date().toISOString(),
        };

        // Latest HR + energy only. Avg/max come from JS running stats — one less HC aggregate per poll.
        const [kcalAggResult, latestHrResult] = await Promise.allSettled([
          mod.aggregateRecord({
            recordType: "ActiveCaloriesBurned",
            timeRangeFilter,
          }),
          mod.readRecords("HeartRate", {
            timeRangeFilter,
            ascendingOrder: false,
            pageSize: 1,
          }),
        ]);

        let heartRateBpm: number | null = null;
        if (latestHrResult.status === "fulfilled") {
          const records = (latestHrResult.value as { records?: any[] })
            ?.records;
          const samples = records?.[0]?.samples as
            | Array<{ beatsPerMinute?: number }>
            | undefined;
          if (samples?.length) {
            heartRateBpm = toNumber(
              samples[samples.length - 1]?.beatsPerMinute
            );
          }
        }

        let caloriesBurned: number | null = null;
        if (kcalAggResult.status === "fulfilled") {
          const kcalAgg = kcalAggResult.value as Record<string, unknown>;
          caloriesBurned = extractKilocalories(
            kcalAgg?.ACTIVE_CALORIES_TOTAL ??
              kcalAgg?.ENERGY_TOTAL ??
              kcalAgg?.energy
          );
          if (caloriesBurned != null) {
            caloriesBurned = Math.round(caloriesBurned);
          }
        }

        return {
          heartRateBpm:
            heartRateBpm != null ? Math.round(heartRateBpm) : null,
          avgHeartRate: null,
          maxHeartRate: null,
          caloriesBurned,
        };
      } catch {
        return null;
      }
    },

    async writeWorkout(input: WriteWorkoutInput) {
      try {
        if (!(await ensureInit())) return false;
        const mod = loadHC()!;
        const startTime = new Date(input.startMs).toISOString();
        const endTime = new Date(
          Math.max(input.endMs, input.startMs + 60_000)
        ).toISOString();
        const exerciseType =
          mod.ExerciseType?.STRENGTH_TRAINING ??
          mod.ExerciseType?.WEIGHTLIFTING ??
          70;

        const records: any[] = [
          {
            recordType: "ExerciseSession",
            exerciseType,
            startTime,
            endTime,
            title: input.title || "EvoFit",
          },
        ];

        if (input.caloriesBurned != null && input.caloriesBurned > 0) {
          records.push({
            recordType: "ActiveCaloriesBurned",
            startTime,
            endTime,
            energy: {
              value: Math.round(input.caloriesBurned),
              unit: "kilocalories",
            },
          });
        }

        await mod.insertRecords(records);
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
        if (!(await ensureInit())) return empty;
        const mod = loadHC()!;
        const now = new Date();
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const [sleepResult, stepsResult] = await Promise.allSettled([
          mod.readRecords("SleepSession", {
            timeRangeFilter: {
              operator: "between",
              startTime: dayAgo.toISOString(),
              endTime: now.toISOString(),
            },
            pageSize: 10,
          }),
          mod.aggregateRecord({
            recordType: "Steps",
            timeRangeFilter: {
              operator: "between",
              startTime: weekAgo.toISOString(),
              endTime: now.toISOString(),
            },
          }),
        ]);

        let sleepHoursLastNight: number | null = null;
        if (sleepResult.status === "fulfilled") {
          const records = (sleepResult.value as { records?: any[] })?.records ?? [];
          let ms = 0;
          for (const r of records) {
            const start = r?.startTime ? new Date(r.startTime).getTime() : NaN;
            const end = r?.endTime ? new Date(r.endTime).getTime() : NaN;
            if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
              ms += end - start;
            }
          }
          if (ms > 0) {
            sleepHoursLastNight = Math.round((ms / 3_600_000) * 10) / 10;
          }
        }

        let stepsLast7Days: number | null = null;
        if (stepsResult.status === "fulfilled") {
          const agg = stepsResult.value as {
            COUNT_TOTAL?: number;
            count?: number;
          };
          stepsLast7Days = toNumber(agg?.COUNT_TOTAL ?? agg?.count);
          if (stepsLast7Days != null) {
            stepsLast7Days = Math.round(stepsLast7Days);
          }
        }

        return { sleepHoursLastNight, stepsLast7Days };
      } catch {
        return empty;
      }
    },
  };
}
