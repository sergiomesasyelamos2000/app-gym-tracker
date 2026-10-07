import type {
  PaginatedRoutineSessions,
  RoutineSessionListItem,
} from "@sergiomesasyelamos2000/shared";

export type HomePaintSource = "cache" | "first-page" | "failure";

export type HomeInitialLoadDeps = {
  userId: string | null;
  epoch: number;
  isCurrent: () => boolean;
  readCache: () => Promise<RoutineSessionListItem[] | null>;
  fetchFirstPage: () => Promise<PaginatedRoutineSessions>;
  refreshFullHistory: () => Promise<RoutineSessionListItem[]>;
  completeFromFirstPage: (
    page: PaginatedRoutineSessions
  ) => Promise<RoutineSessionListItem[]>;
};

export type HomeInitialLoadHooks = {
  onReady: (
    sessions: RoutineSessionListItem[],
    source: HomePaintSource
  ) => void;
  onBackground: (sessions: RoutineSessionListItem[]) => void;
};

/**
 * First useful Home paint: cache → unlock, else first page → unlock,
 * else failure → unlock. Full history / enrich run after onReady.
 */
export async function runHomeInitialLoad(
  deps: HomeInitialLoadDeps,
  hooks: HomeInitialLoadHooks
): Promise<void> {
  if (!deps.userId) {
    if (deps.isCurrent()) {
      hooks.onReady([], "failure");
    }
    return;
  }

  const cache = await deps.readCache();
  if (!deps.isCurrent()) return;

  if (cache !== null) {
    hooks.onReady(cache, "cache");
    try {
      const full = await deps.refreshFullHistory();
      if (deps.isCurrent()) {
        hooks.onBackground(full);
      }
    } catch {
      // Keep cached list; stay ready.
    }
    return;
  }

  try {
    const page = await deps.fetchFirstPage();
    if (!deps.isCurrent()) return;
    hooks.onReady(page.items, "first-page");
    try {
      const full = await deps.completeFromFirstPage(page);
      if (deps.isCurrent()) {
        hooks.onBackground(full);
      }
    } catch {
      // Keep first page; stay ready.
    }
  } catch {
    if (deps.isCurrent()) {
      hooks.onReady([], "failure");
    }
  }
}
