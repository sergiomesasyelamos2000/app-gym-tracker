import type {
  PaginatedRoutineSessions,
  RoutineSessionListItem,
} from "@sergiomesasyelamos2000/shared";
import { runHomeInitialLoad } from "../homeFirstLoad";

function session(id: string): RoutineSessionListItem {
  return { id } as RoutineSessionListItem;
}

function page(
  items: RoutineSessionListItem[],
  nextCursor: string | null = null,
  hasMore = false
): PaginatedRoutineSessions {
  return { items, nextCursor, hasMore };
}

describe("runHomeInitialLoad", () => {
  it("cache hit: onReady(cache) before first page; background still runs", async () => {
    const cached = [session("c1")];
    const full = [session("c1"), session("c2")];
    const fetchFirstPage = jest.fn();
    const onReady = jest.fn();
    const onBackground = jest.fn();

    await runHomeInitialLoad(
      {
        userId: "u1",
        epoch: 0,
        isCurrent: () => true,
        readCache: async () => cached,
        fetchFirstPage,
        refreshFullHistory: async () => full,
        completeFromFirstPage: jest.fn(),
      },
      { onReady, onBackground }
    );

    expect(onReady).toHaveBeenCalledTimes(1);
    expect(onReady).toHaveBeenCalledWith(cached, "cache");
    expect(fetchFirstPage).not.toHaveBeenCalled();
    expect(onBackground).toHaveBeenCalledWith(full);
  });

  it("cache miss: onReady(first page) before completeFromFirstPage finishes", async () => {
    const first = page([session("p1")], "cursor-1", true);
    const full = [session("p1"), session("p2")];
    let resolveComplete: (value: RoutineSessionListItem[]) => void = () => {};
    const completePromise = new Promise<RoutineSessionListItem[]>((resolve) => {
      resolveComplete = resolve;
    });
    const onReady = jest.fn();
    const onBackground = jest.fn();
    let readySeenBeforeComplete = false;

    const loadPromise = runHomeInitialLoad(
      {
        userId: "u1",
        epoch: 0,
        isCurrent: () => true,
        readCache: async () => null,
        fetchFirstPage: async () => first,
        refreshFullHistory: jest.fn(),
        completeFromFirstPage: async () => {
          readySeenBeforeComplete = onReady.mock.calls.length === 1;
          return completePromise;
        },
      },
      { onReady, onBackground }
    );

    // Let first page resolve and onReady fire; complete still pending.
    await Promise.resolve();
    await Promise.resolve();
    expect(onReady).toHaveBeenCalledWith(first.items, "first-page");
    expect(onBackground).not.toHaveBeenCalled();

    resolveComplete(full);
    await loadPromise;
    expect(readySeenBeforeComplete).toBe(true);
    expect(onBackground).toHaveBeenCalledWith(full);
  });

  it("cache miss and first page throws: failure unlock; no complete", async () => {
    const completeFromFirstPage = jest.fn();
    const onReady = jest.fn();

    await runHomeInitialLoad(
      {
        userId: "u1",
        epoch: 0,
        isCurrent: () => true,
        readCache: async () => null,
        fetchFirstPage: async () => {
          throw new Error("network");
        },
        refreshFullHistory: jest.fn(),
        completeFromFirstPage,
      },
      { onReady, onBackground: jest.fn() }
    );

    expect(onReady).toHaveBeenCalledWith([], "failure");
    expect(completeFromFirstPage).not.toHaveBeenCalled();
  });

  it("cache hit and full refresh throws: no failure paint", async () => {
    const cached = [session("c1")];
    const onReady = jest.fn();
    const onBackground = jest.fn();

    await runHomeInitialLoad(
      {
        userId: "u1",
        epoch: 0,
        isCurrent: () => true,
        readCache: async () => cached,
        fetchFirstPage: jest.fn(),
        refreshFullHistory: async () => {
          throw new Error("offline");
        },
        completeFromFirstPage: jest.fn(),
      },
      { onReady, onBackground }
    );

    expect(onReady).toHaveBeenCalledWith(cached, "cache");
    expect(onBackground).not.toHaveBeenCalled();
  });

  it("userId null: failure unlock with no IO", async () => {
    const readCache = jest.fn();
    const onReady = jest.fn();

    await runHomeInitialLoad(
      {
        userId: null,
        epoch: 0,
        isCurrent: () => true,
        readCache,
        fetchFirstPage: jest.fn(),
        refreshFullHistory: jest.fn(),
        completeFromFirstPage: jest.fn(),
      },
      { onReady, onBackground: jest.fn() }
    );

    expect(readCache).not.toHaveBeenCalled();
    expect(onReady).toHaveBeenCalledWith([], "failure");
  });

  it("drops hooks when isCurrent becomes false", async () => {
    let current = true;
    const onReady = jest.fn();
    const onBackground = jest.fn();

    await runHomeInitialLoad(
      {
        userId: "u1",
        epoch: 0,
        isCurrent: () => current,
        readCache: async () => {
          current = false;
          return [session("c1")];
        },
        fetchFirstPage: jest.fn(),
        refreshFullHistory: async () => [session("c1")],
        completeFromFirstPage: jest.fn(),
      },
      { onReady, onBackground }
    );

    expect(onReady).not.toHaveBeenCalled();
    expect(onBackground).not.toHaveBeenCalled();
  });
});
