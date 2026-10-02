import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ExerciseRequestDto } from "@sergiomesasyelamos2000/shared";
import { ENV } from "../../environments/environment";
import {
  EXERCISE_CACHE_KEY,
  EXERCISE_CATALOG_TTL_MS,
  EXERCISE_LAST_SYNC_KEY,
  LEGACY_EXERCISE_CACHE_KEY,
  applyNetworkExerciseCatalog,
  clearExerciseCatalogStorage,
  getCatalogWriteGeneration,
  invalidateExerciseCatalogMemory,
  isExerciseCatalogStale,
  peekExerciseCatalog,
  readExerciseCatalog,
  upsertExerciseInCatalog,
  writeExerciseCatalog,
} from "../exerciseCatalogCache";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("../../environments/environment", () => ({
  ENV: { API_URL: "http://test.local/api" },
}));

const makeExercise = (
  overrides: Partial<ExerciseRequestDto> = {}
): ExerciseRequestDto =>
  ({
    id: "ex-1",
    name: "Bench Press",
    imageUrl: "https://res.cloudinary.com/demo/image/upload/v1/bench.png",
    ...overrides,
  }) as ExerciseRequestDto;

describe("exerciseCatalogCache", () => {
  beforeEach(async () => {
    invalidateExerciseCatalogMemory();
    await AsyncStorage.clear();
  });

  it("peek is null until memory is populated", async () => {
    expect(peekExerciseCatalog()).toBeNull();

    await writeExerciseCatalog([makeExercise()], Date.now());
    expect(peekExerciseCatalog()?.[0]?.id).toBe("ex-1");
  });

  it("reports stale when syncedAt exceeds TTL", async () => {
    const old = Date.now() - EXERCISE_CATALOG_TTL_MS - 1000;
    await writeExerciseCatalog([makeExercise()], old);
    expect(isExerciseCatalogStale()).toBe(true);

    await writeExerciseCatalog([makeExercise()], Date.now());
    expect(isExerciseCatalogStale()).toBe(false);
  });

  it("migrates HTTP-only v3 cache to v4 and removes v3", async () => {
    const exercises = [makeExercise()];
    await AsyncStorage.setItem(
      LEGACY_EXERCISE_CACHE_KEY,
      JSON.stringify(exercises)
    );
    await AsyncStorage.setItem(EXERCISE_LAST_SYNC_KEY, String(Date.now()));
    await AsyncStorage.setItem(
      "@exercises_cache_api_url",
      "http://test.local/api"
    );

    const snapshot = await readExerciseCatalog();
    expect(snapshot?.exercises).toHaveLength(1);
    expect(await AsyncStorage.getItem(EXERCISE_CACHE_KEY)).toBeTruthy();
    expect(await AsyncStorage.getItem(LEGACY_EXERCISE_CACHE_KEY)).toBeNull();
  });

  it("rejects base64 v3 cache and does not write v4", async () => {
    const exercises = [
      makeExercise({
        imageUrl: `data:image/png;base64,${"A".repeat(80)}`,
      }),
    ];
    await AsyncStorage.setItem(
      LEGACY_EXERCISE_CACHE_KEY,
      JSON.stringify(exercises)
    );
    await AsyncStorage.setItem(
      "@exercises_cache_api_url",
      "http://test.local/api"
    );

    const snapshot = await readExerciseCatalog();
    expect(snapshot).toBeNull();
    expect(await AsyncStorage.getItem(EXERCISE_CACHE_KEY)).toBeNull();
    expect(await AsyncStorage.getItem(LEGACY_EXERCISE_CACHE_KEY)).toBeNull();
  });

  it("ignores memory when API URL mismatches", async () => {
    await writeExerciseCatalog([makeExercise()], Date.now());
    expect(peekExerciseCatalog()).not.toBeNull();

    (ENV as { API_URL: string }).API_URL = "http://other.local/api";
    expect(peekExerciseCatalog()).toBeNull();

    (ENV as { API_URL: string }).API_URL = "http://test.local/api";
  });

  it("upserts a new exercise at the front of memory", async () => {
    await writeExerciseCatalog([makeExercise()], Date.now());
    upsertExerciseInCatalog(makeExercise({ id: "ex-2", name: "Squat" }));

    const peeked = peekExerciseCatalog();
    expect(peeked?.[0]?.id).toBe("ex-2");
    expect(peeked).toHaveLength(2);
  });

  it("clearExerciseCatalogStorage wipes memory and keys", async () => {
    await writeExerciseCatalog([makeExercise()], Date.now());
    await clearExerciseCatalogStorage();
    expect(peekExerciseCatalog()).toBeNull();
    expect(await AsyncStorage.getItem(EXERCISE_CACHE_KEY)).toBeNull();
  });

  it("migrates HTTP-only v2 cache to v4 and removes v2", async () => {
    const exercises = [makeExercise()];
    await AsyncStorage.setItem(
      "@exercises_cache_v2",
      JSON.stringify(exercises)
    );
    await AsyncStorage.setItem(EXERCISE_LAST_SYNC_KEY, String(Date.now()));
    await AsyncStorage.setItem(
      "@exercises_cache_api_url",
      "http://test.local/api"
    );

    const snapshot = await readExerciseCatalog();
    expect(snapshot?.exercises).toHaveLength(1);
    expect(await AsyncStorage.getItem(EXERCISE_CACHE_KEY)).toBeTruthy();
    expect(await AsyncStorage.getItem("@exercises_cache_v2")).toBeNull();
  });

  it("merges local upsert into an in-flight network write", async () => {
    await writeExerciseCatalog([makeExercise()], Date.now());
    const generationAtStart = getCatalogWriteGeneration();

    upsertExerciseInCatalog(makeExercise({ id: "ex-new", name: "Custom" }));

    await applyNetworkExerciseCatalog([makeExercise()], generationAtStart);

    const peeked = peekExerciseCatalog();
    expect(peeked?.some((item) => item.id === "ex-new")).toBe(true);
    expect(peeked?.some((item) => item.id === "ex-1")).toBe(true);
  });
});
