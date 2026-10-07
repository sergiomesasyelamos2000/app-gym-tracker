import AsyncStorage from "@react-native-async-storage/async-storage";
import type { RoutineSessionListItem } from "@sergiomesasyelamos2000/shared";

const mockApiFetch = jest.fn();
const mockEnrich = jest.fn(async (exercises: unknown[]) => exercises);

jest.mock("../../../../api/client", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

jest.mock("../../utils/enrichSessionExerciseImages", () => ({
  enrichSessionExercisesWithCatalogImages: (...args: unknown[]) =>
    mockEnrich(...args),
}));

import {
  findAllRoutineSessions,
  invalidateRoutineSessionsCacheWrites,
  persistEnrichedSessionsCache,
  readCachedRoutineSessions,
} from "../routineService";

const SESSIONS_CACHE_KEY = "@sessions_cache_v2";

describe("routineService home sessions helpers", () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    mockApiFetch.mockReset();
    mockEnrich.mockClear();

    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) =>
      memory.has(key) ? memory.get(key)! : null
    );
    (AsyncStorage.setItem as jest.Mock).mockImplementation(
      async (key: string, value: string) => {
        memory.set(key, value);
      }
    );
    (AsyncStorage.clear as jest.Mock).mockImplementation(async () => {
      memory.clear();
    });
    (AsyncStorage.removeItem as jest.Mock).mockImplementation(
      async (key: string) => {
        memory.delete(key);
      }
    );
  });

  describe("readCachedRoutineSessions", () => {
    it("returns cached array including empty", async () => {
      await AsyncStorage.setItem(SESSIONS_CACHE_KEY, JSON.stringify([]));
      await expect(readCachedRoutineSessions()).resolves.toEqual([]);

      const rows = [{ id: "s1" }] as RoutineSessionListItem[];
      await AsyncStorage.setItem(SESSIONS_CACHE_KEY, JSON.stringify(rows));
      await expect(readCachedRoutineSessions()).resolves.toEqual(rows);
    });

    it("returns null when missing, corrupt, or non-array", async () => {
      await expect(readCachedRoutineSessions()).resolves.toBeNull();

      await AsyncStorage.setItem(SESSIONS_CACHE_KEY, "{not-json");
      await expect(readCachedRoutineSessions()).resolves.toBeNull();

      await AsyncStorage.setItem(SESSIONS_CACHE_KEY, JSON.stringify({ a: 1 }));
      await expect(readCachedRoutineSessions()).resolves.toBeNull();
    });
  });

  it("persistEnrichedSessionsCache writes only after enrich", async () => {
    const sessions = [
      { id: "s1", exercises: [{ exerciseId: "e1", sets: [] }] },
    ] as unknown as RoutineSessionListItem[];

    const result = await persistEnrichedSessionsCache(sessions);

    expect(mockEnrich).toHaveBeenCalled();
    expect(result[0].id).toBe("s1");
    expect(memory.get(SESSIONS_CACHE_KEY)).toBe(JSON.stringify(result));
  });

  it("findAllRoutineSessions writes cache only after full collect", async () => {
    mockApiFetch.mockResolvedValueOnce({
      items: [{ id: "s1", exercises: [] }],
      nextCursor: null,
      hasMore: false,
    });

    const result = await findAllRoutineSessions();

    expect(result).toHaveLength(1);
    expect(mockEnrich).toHaveBeenCalled();
    expect(memory.get(SESSIONS_CACHE_KEY)).toBe(JSON.stringify(result));
  });

  it("skips cache write when invalidated during enrich", async () => {
    let resolveEnrich: (value: unknown[]) => void = () => {};
    mockEnrich.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveEnrich = resolve;
        })
    );

    const sessions = [
      { id: "s1", exercises: [{ exerciseId: "e1", sets: [] }] },
    ] as unknown as RoutineSessionListItem[];

    const persistPromise = persistEnrichedSessionsCache(sessions);
    invalidateRoutineSessionsCacheWrites();
    resolveEnrich([{ exerciseId: "e1", sets: [] }]);
    await persistPromise;

    expect(memory.has(SESSIONS_CACHE_KEY)).toBe(false);
  });

  it("findAllRoutineSessions skips persist when logout happens during fetch", async () => {
    let resolvePage: (value: unknown) => void = () => {};
    mockApiFetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePage = resolve;
        })
    );

    const loadPromise = findAllRoutineSessions();
    invalidateRoutineSessionsCacheWrites();
    resolvePage({
      items: [{ id: "old-user", exercises: [] }],
      nextCursor: null,
      hasMore: false,
    });
    const result = await loadPromise;

    expect(result).toEqual([{ id: "old-user", exercises: [] }]);
    expect(memory.has(SESSIONS_CACHE_KEY)).toBe(false);
    expect(mockEnrich).not.toHaveBeenCalled();
  });
});
