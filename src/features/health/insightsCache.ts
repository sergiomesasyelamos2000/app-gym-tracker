import { findSessionBurnSummaries } from "../routine/services/routineService";
import {
  buildBurnedCaloriesByDate,
  type SessionWithBurn,
} from "../nutrition/utils/dailyEnergyBudget";
import { getHealthClient } from "./healthClient";
import type { RestSummary } from "./types";

const DEFAULT_BURNED_TTL_MS = 5 * 60 * 1000;
const DEFAULT_REST_TTL_MS = 15 * 60 * 1000;

type BurnedCache = {
  at: number;
  sessions: SessionWithBurn[];
  byDate: Record<string, number>;
};

let burnedCache: BurnedCache | null = null;
let burnedInFlight: Promise<BurnedCache> | null = null;

let restCache: { at: number; summary: RestSummary } | null = null;
let restInFlight: Promise<RestSummary> | null = null;

/** Call after saving a workout so macros/profile pick up new burn. */
export function invalidateSessionBurnCache(): void {
  burnedCache = null;
}

export function invalidateRestSummaryCache(): void {
  restCache = null;
}

/**
 * Cached slim session list + burned-by-date map.
 * Dedupes concurrent callers (Profile + Macros) and avoids full refetch within TTL.
 */
export async function getBurnedInsightsCached(options?: {
  maxAgeMs?: number;
  force?: boolean;
}): Promise<BurnedCache> {
  const maxAge = options?.maxAgeMs ?? DEFAULT_BURNED_TTL_MS;
  if (
    !options?.force &&
    burnedCache &&
    Date.now() - burnedCache.at < maxAge
  ) {
    return burnedCache;
  }

  if (burnedInFlight) return burnedInFlight;

  burnedInFlight = (async () => {
    try {
      const sessions = await findSessionBurnSummaries().catch(() => []);
      const slim: SessionWithBurn[] = sessions.map((s) => ({
        createdAt: s.createdAt,
        caloriesBurned:
          typeof s.caloriesBurned === "number" ? s.caloriesBurned : null,
      }));
      const next: BurnedCache = {
        at: Date.now(),
        sessions: slim,
        byDate: buildBurnedCaloriesByDate(slim),
      };
      burnedCache = next;
      return next;
    } finally {
      burnedInFlight = null;
    }
  })();

  return burnedInFlight;
}

/** Sleep/steps from the health hub — changes slowly, safe to cache longer. */
export async function getRestSummaryCached(options?: {
  maxAgeMs?: number;
  force?: boolean;
}): Promise<RestSummary> {
  const maxAge = options?.maxAgeMs ?? DEFAULT_REST_TTL_MS;
  if (
    !options?.force &&
    restCache &&
    Date.now() - restCache.at < maxAge
  ) {
    return restCache.summary;
  }

  if (restInFlight) return restInFlight;

  restInFlight = (async () => {
    try {
      const summary = await getHealthClient().getRestSummary();
      restCache = { at: Date.now(), summary };
      return summary;
    } finally {
      restInFlight = null;
    }
  })();

  return restInFlight;
}
