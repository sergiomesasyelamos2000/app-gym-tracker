import { NativeModules, Platform } from "react-native";
import {
  noteWorkoutLiveRestEnd,
  resetWorkoutLiveStateForTests,
  startWorkoutLive,
  updateWorkoutLive,
} from "../workoutLiveService";

const mockUpdateWorkoutLive = jest.fn();
const mockStartWorkoutLive = jest.fn(async () => true);
const mockEndWorkoutLive = jest.fn(async () => true);
const mockClearRestLive = jest.fn(async () => true);

const originalOs = Platform.OS;

const baseSnapshot = {
  workoutStartedAtMs: 1_700_000_000_000,
  exerciseName: "Press banca",
  imageUrl: null,
  nextSetSummary: "Serie 2 de 3",
  isResting: true,
  restEndAtMs: 1_700_000_090_000,
  restSecondsDefault: 90,
};

describe("workoutLiveService rest sync", () => {
  beforeAll(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => "ios",
    });
    NativeModules.RestTimerLiveActivity = {
      updateWorkoutLive: (...args: unknown[]) =>
        mockUpdateWorkoutLive(...args),
      startWorkoutLive: (...args: unknown[]) => mockStartWorkoutLive(...args),
      endWorkoutLive: (...args: unknown[]) => mockEndWorkoutLive(...args),
      clearRestLive: (...args: unknown[]) => mockClearRestLive(...args),
    };
    NativeModules.RestTimerLiveActivityModule = {};
  });

  afterAll(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => originalOs,
    });
    delete NativeModules.RestTimerLiveActivity;
    delete NativeModules.RestTimerLiveActivityModule;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    resetWorkoutLiveStateForTests();
    mockUpdateWorkoutLive.mockResolvedValue(true);
    mockStartWorkoutLive.mockResolvedValue(true);
  });

  it("does not stick lastSentSnapshot when native returns false", async () => {
    await startWorkoutLive({
      ...baseSnapshot,
      isResting: false,
      restEndAtMs: null,
    });

    mockUpdateWorkoutLive.mockResolvedValueOnce(false);
    await updateWorkoutLive({
      ...baseSnapshot,
      restEndAtMs: 1_700_000_105_400,
      restSecondsDefault: 105,
    });

    mockUpdateWorkoutLive.mockClear();
    mockUpdateWorkoutLive.mockResolvedValue(true);

    await updateWorkoutLive({
      ...baseSnapshot,
      restEndAtMs: 1_700_000_105_400,
      restSecondsDefault: 105,
    });

    expect(mockUpdateWorkoutLive).toHaveBeenCalledTimes(1);
    expect(mockUpdateWorkoutLive.mock.calls[0][5]).toBe(1_700_000_105_400);
  });

  it("sends the latest rest end when updates burst", async () => {
    await startWorkoutLive({
      ...baseSnapshot,
      isResting: false,
      restEndAtMs: null,
    });

    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    mockUpdateWorkoutLive
      .mockImplementationOnce(async () => {
        await firstGate;
        return true;
      })
      .mockResolvedValue(true);

    const first = updateWorkoutLive({
      ...baseSnapshot,
      restEndAtMs: 1_700_000_105_000,
      restSecondsDefault: 105,
    });
    const second = updateWorkoutLive({
      ...baseSnapshot,
      restEndAtMs: 1_700_000_120_000,
      restSecondsDefault: 120,
    });
    const third = updateWorkoutLive({
      ...baseSnapshot,
      restEndAtMs: 1_700_000_135_000,
      restSecondsDefault: 135,
    });

    releaseFirst();
    await Promise.all([first, second, third]);

    expect(mockUpdateWorkoutLive).toHaveBeenCalledTimes(2);
    const ends = mockUpdateWorkoutLive.mock.calls.map((call) => call[5]);
    expect(ends).toEqual([1_700_000_105_000, 1_700_000_135_000]);
  });

  it("keeps exact rest end milliseconds on the wire", async () => {
    await startWorkoutLive({
      ...baseSnapshot,
      isResting: false,
      restEndAtMs: null,
    });

    await updateWorkoutLive({
      ...baseSnapshot,
      restEndAtMs: 1_700_000_105_400,
      restSecondsDefault: 105,
    });

    expect(mockUpdateWorkoutLive.mock.calls[0][5]).toBe(1_700_000_105_400);
  });

  it("island note wins over a queued toast write", async () => {
    await startWorkoutLive({
      ...baseSnapshot,
      isResting: true,
      restEndAtMs: 1_700_000_090_000,
    });

    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    mockUpdateWorkoutLive.mockImplementationOnce(async () => {
      await firstGate;
      return true;
    });

    const toastWrite = updateWorkoutLive({
      ...baseSnapshot,
      restEndAtMs: 1_700_000_105_000,
      restSecondsDefault: 105,
    });

    const queued = updateWorkoutLive({
      ...baseSnapshot,
      restEndAtMs: 1_700_000_120_000,
      restSecondsDefault: 120,
    });

    noteWorkoutLiveRestEnd(1_700_000_150_250, 150);

    releaseFirst();
    await Promise.all([toastWrite, queued]);
    // Allow the corrective Island re-assert (enqueued inside the stale job) to drain.
    await new Promise<void>((resolve) => setImmediate(resolve));

    // Stale in-flight toast end must be followed by a corrective Island push.
    const ends = mockUpdateWorkoutLive.mock.calls.map((call) => call[5]);
    expect(ends[0]).toBe(1_700_000_105_000);
    expect(ends[ends.length - 1]).toBe(1_700_000_150_250);

    mockUpdateWorkoutLive.mockClear();
    mockUpdateWorkoutLive.mockResolvedValue(true);

    await updateWorkoutLive({
      ...baseSnapshot,
      restEndAtMs: 1_700_000_120_000,
      restSecondsDefault: 120,
    });

    expect(mockUpdateWorkoutLive).toHaveBeenCalledTimes(1);
    expect(mockUpdateWorkoutLive.mock.calls[0][5]).toBe(1_700_000_120_000);
  });
});
