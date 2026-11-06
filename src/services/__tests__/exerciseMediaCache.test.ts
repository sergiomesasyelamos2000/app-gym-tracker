import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import type { ExerciseRequestDto } from "@sergiomesasyelamos2000/shared";
import * as FileSystem from "expo-file-system/legacy";
import {
  EXERCISE_MEDIA_FAIL_RETRY_MS,
  EXERCISE_MEDIA_INDEX_KEY,
  EXERCISE_MEDIA_MAX_BYTES,
  __resetExerciseMediaCacheForTests,
  clearExerciseMediaCache,
  collectExerciseMediaJobs,
  ensureExerciseMediaIndex,
  peekCachedStaticUri,
  peekExerciseLocalMedia,
  warmExerciseMediaCacheAsync,
} from "../exerciseMediaCache";

jest.mock("expo-file-system/legacy", () => {
  const downloads: Array<{
    url: string;
    path: string;
    downloadAsync: jest.Mock;
    cancelAsync: jest.Mock;
  }> = [];
  return {
    documentDirectory: "file:///docs/",
    getInfoAsync: jest.fn(),
    makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
    deleteAsync: jest.fn().mockResolvedValue(undefined),
    readDirectoryAsync: jest.fn().mockResolvedValue([]),
    createDownloadResumable: jest.fn((url: string, path: string) => {
      const handle = {
        url,
        path,
        downloadAsync: jest.fn(),
        cancelAsync: jest.fn().mockResolvedValue(undefined),
      };
      downloads.push(handle);
      return handle;
    }),
    __downloads: downloads,
  };
});

jest.mock("@react-native-community/netinfo", () => ({
  fetch: jest.fn(),
}));

const fs = FileSystem as typeof FileSystem & {
  __downloads: Array<{
    url: string;
    path: string;
    downloadAsync: jest.Mock;
    cancelAsync: jest.Mock;
  }>;
  getInfoAsync: jest.Mock;
  makeDirectoryAsync: jest.Mock;
  deleteAsync: jest.Mock;
  readDirectoryAsync: jest.Mock;
  createDownloadResumable: jest.Mock;
};

const mockedNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;

const memory = new Map<string, string>();

function exercise(
  partial: Partial<ExerciseRequestDto> & { id: string; name?: string }
): ExerciseRequestDto {
  return {
    name: partial.name ?? "Ex",
    muscularGroup: "chest",
    ...partial,
  } as ExerciseRequestDto;
}

describe("collectExerciseMediaJobs", () => {
  it("queues static + gif and skips video when gif exists", () => {
    const jobs = collectExerciseMediaJobs([
      exercise({
        id: "e1",
        imageUrl: "https://cdn.example.com/e1.jpg",
        giftUrl: "https://cdn.example.com/e1.gif",
        videoUrl: "https://cdn.example.com/e1.mp4",
      } as never),
    ]);
    expect(jobs.map((j) => j.kind)).toEqual(["static", "gif"]);
  });

  it("queues video when gif is absent", () => {
    const jobs = collectExerciseMediaJobs([
      exercise({
        id: "e2",
        imageUrl: "https://cdn.example.com/e2.jpg",
        videoUrl: "https://cdn.example.com/e2.mp4",
      } as never),
    ]);
    expect(jobs.map((j) => j.kind)).toEqual(["static", "video"]);
  });

  it("skips data and blank urls", () => {
    const jobs = collectExerciseMediaJobs([
      exercise({
        id: "e3",
        imageUrl: "data:image/png;base64,AAAA",
        giftUrl: "  ",
      } as never),
    ]);
    expect(jobs).toEqual([]);
  });
});

describe("warmExerciseMediaCache", () => {
  beforeEach(() => {
    memory.clear();
    __resetExerciseMediaCacheForTests();
    fs.__downloads.length = 0;
    fs.createDownloadResumable.mockClear();
    fs.getInfoAsync.mockReset();
    fs.makeDirectoryAsync.mockClear();
    fs.deleteAsync.mockClear();
    fs.readDirectoryAsync.mockResolvedValue([]);
    mockedNetInfo.fetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    } as never);

    (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) =>
      memory.has(key) ? memory.get(key)! : null
    );
    (AsyncStorage.setItem as jest.Mock).mockImplementation(
      async (key: string, value: string) => {
        memory.set(key, value);
      }
    );
    (AsyncStorage.removeItem as jest.Mock).mockImplementation(
      async (key: string) => {
        memory.delete(key);
      }
    );

    // Default: dirs missing, then file exists after download with size.
    fs.getInfoAsync.mockImplementation(async (path: string) => {
      if (path.endsWith(".jpg") || path.endsWith(".gif") || path.endsWith(".mp4")) {
        return { exists: true, size: 1024, isDirectory: false };
      }
      return { exists: false, isDirectory: false };
    });
  });

  it("downloads once and skips second warm when sourceUrl matches", async () => {
    fs.createDownloadResumable.mockImplementation((url: string, path: string) => {
      const handle = {
        url,
        path,
        downloadAsync: jest.fn().mockResolvedValue({ status: 200, uri: path }),
        cancelAsync: jest.fn(),
      };
      fs.__downloads.push(handle);
      return handle;
    });

    const list = [
      exercise({
        id: "e1",
        imageUrl: "https://cdn.example.com/e1.jpg",
      } as never),
    ];

    await warmExerciseMediaCacheAsync(list);
    expect(fs.createDownloadResumable).toHaveBeenCalledTimes(1);

    fs.createDownloadResumable.mockClear();
    await warmExerciseMediaCacheAsync(list);
    expect(fs.createDownloadResumable).not.toHaveBeenCalled();

    const local = peekExerciseLocalMedia("e1");
    expect(local.staticUri).toBe("file:///docs/exercise-media/e1/static.jpg");
    expect(peekCachedStaticUri("https://cdn.example.com/e1.jpg")).toBe(
      local.staticUri
    );
  });

  it("redownloads when sourceUrl changes", async () => {
    fs.createDownloadResumable.mockImplementation((url: string, path: string) => ({
      url,
      path,
      downloadAsync: jest.fn().mockResolvedValue({ status: 200, uri: path }),
      cancelAsync: jest.fn(),
    }));

    await warmExerciseMediaCacheAsync([
      exercise({
        id: "e1",
        imageUrl: "https://cdn.example.com/old.jpg",
      } as never),
    ]);

    await warmExerciseMediaCacheAsync([
      exercise({
        id: "e1",
        imageUrl: "https://cdn.example.com/new.jpg",
      } as never),
    ]);

    expect(peekCachedStaticUri("https://cdn.example.com/new.jpg")).toContain(
      "static.jpg"
    );
    expect(peekCachedStaticUri("https://cdn.example.com/old.jpg")).toBeNull();
  });

  it("marks failure on non-200 and skips retry within window", async () => {
    fs.createDownloadResumable.mockImplementation((url: string, path: string) => ({
      url,
      path,
      downloadAsync: jest.fn().mockResolvedValue({ status: 404, uri: path }),
      cancelAsync: jest.fn(),
    }));

    await warmExerciseMediaCacheAsync([
      exercise({
        id: "e1",
        imageUrl: "https://cdn.example.com/missing.jpg",
      } as never),
    ]);

    fs.createDownloadResumable.mockClear();
    await warmExerciseMediaCacheAsync([
      exercise({
        id: "e1",
        imageUrl: "https://cdn.example.com/missing.jpg",
      } as never),
    ]);
    expect(fs.createDownloadResumable).not.toHaveBeenCalled();

    const index = JSON.parse(memory.get(EXERCISE_MEDIA_INDEX_KEY) ?? "{}");
    expect(index.e1.failures.static.sourceUrl).toBe(
      "https://cdn.example.com/missing.jpg"
    );
    expect(index.e1.failures.static.failedAt).toBeGreaterThan(
      Date.now() - EXERCISE_MEDIA_FAIL_RETRY_MS
    );
  });

  it("does not download when offline", async () => {
    mockedNetInfo.fetch.mockResolvedValue({
      isConnected: false,
      isInternetReachable: false,
    } as never);

    await warmExerciseMediaCacheAsync([
      exercise({
        id: "e1",
        imageUrl: "https://cdn.example.com/e1.jpg",
      } as never),
    ]);

    expect(fs.createDownloadResumable).not.toHaveBeenCalled();
  });

  it("still downloads static after motion cap is reached", async () => {
    // Seed motion bytes at the cap (static bytes must not block new static downloads).
    memory.set(
      EXERCISE_MEDIA_INDEX_KEY,
      JSON.stringify({
        seeded: {
          static: {
            sourceUrl: "https://cdn.example.com/seed.jpg",
            relativePath: "exercise-media/seeded/static.jpg",
            bytes: EXERCISE_MEDIA_MAX_BYTES,
            savedAt: Date.now(),
          },
          gif: {
            sourceUrl: "https://cdn.example.com/seed.gif",
            relativePath: "exercise-media/seeded/gif.gif",
            bytes: EXERCISE_MEDIA_MAX_BYTES,
            savedAt: Date.now(),
          },
        },
      })
    );
    await ensureExerciseMediaIndex();

    const downloadedKinds: string[] = [];
    fs.createDownloadResumable.mockImplementation((url: string, path: string) => {
      downloadedKinds.push(path);
      return {
        url,
        path,
        downloadAsync: jest.fn().mockResolvedValue({ status: 200, uri: path }),
        cancelAsync: jest.fn(),
      };
    });

    await warmExerciseMediaCacheAsync([
      exercise({
        id: "seeded",
        imageUrl: "https://cdn.example.com/seed.jpg",
        giftUrl: "https://cdn.example.com/seed.gif",
      } as never),
      exercise({
        id: "e-new",
        imageUrl: "https://cdn.example.com/new.jpg",
        giftUrl: "https://cdn.example.com/new.gif",
      } as never),
    ]);

    expect(
      downloadedKinds.some((p) => p.includes("e-new/static.jpg"))
    ).toBe(true);
    expect(downloadedKinds.some((p) => p.includes("e-new/gif.gif"))).toBe(
      false
    );
  });

  it("clears media files and index", async () => {
    memory.set(EXERCISE_MEDIA_INDEX_KEY, JSON.stringify({ e1: {} }));
    await ensureExerciseMediaIndex();
    fs.getInfoAsync.mockResolvedValue({
      exists: true,
      isDirectory: true,
    } as never);
    await clearExerciseMediaCache();
    expect(memory.has(EXERCISE_MEDIA_INDEX_KEY)).toBe(false);
    expect(fs.deleteAsync).toHaveBeenCalled();
  });
});
