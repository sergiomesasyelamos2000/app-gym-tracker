import { hydrateExerciseMediaFromCatalog } from "../hydrateExerciseMediaFromCatalog";
import { fetchExercises, peekExerciseCatalog } from "../../../../services/exerciseService";

jest.mock("../../../../services/exerciseService", () => ({
  fetchExercises: jest.fn(),
  peekExerciseCatalog: jest.fn(),
}));

const mockFetchExercises = fetchExercises as jest.MockedFunction<
  typeof fetchExercises
>;
const mockPeekExerciseCatalog = peekExerciseCatalog as jest.MockedFunction<
  typeof peekExerciseCatalog
>;

const sessionExercise = {
  id: "ex-1",
  name: "Bench Press",
  imageUrl: "https://cdn.example.com/bench-static.png",
  sets: [{ id: "s1", order: 1, weight: 60, reps: 8, completed: true }],
};

const catalogExercise = {
  id: "ex-1",
  name: "Bench Press (catalog)",
  imageUrl: "https://cdn.example.com/bench-static.png",
  giftUrl: "https://cdn.example.com/bench.gif",
  videoUrl: "https://cdn.example.com/bench.mp4",
  muscularGroup: "Pecho",
};

describe("hydrateExerciseMediaFromCatalog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPeekExerciseCatalog.mockReturnValue(null);
  });

  it("returns the same exercise when videoUrl is already present", async () => {
    const exercise = {
      ...sessionExercise,
      videoUrl: "https://cdn.example.com/already.mp4",
    };

    const result = await hydrateExerciseMediaFromCatalog(exercise);

    expect(result).toBe(exercise);
    expect(mockPeekExerciseCatalog).not.toHaveBeenCalled();
    expect(mockFetchExercises).not.toHaveBeenCalled();
  });

  it("returns the same exercise when giftUrl is already present", async () => {
    const exercise = {
      ...sessionExercise,
      giftUrl: "https://cdn.example.com/already.gif",
    };

    const result = await hydrateExerciseMediaFromCatalog(exercise);

    expect(result).toBe(exercise);
    expect(mockFetchExercises).not.toHaveBeenCalled();
  });

  it("returns the same exercise when gifUrl is already present", async () => {
    const exercise = {
      ...sessionExercise,
      gifUrl: "https://cdn.example.com/already.gif",
    };

    const result = await hydrateExerciseMediaFromCatalog(exercise);

    expect(result).toBe(exercise);
    expect(mockFetchExercises).not.toHaveBeenCalled();
  });

  it("fills missing videoUrl and giftUrl from in-memory catalog peek", async () => {
    mockPeekExerciseCatalog.mockReturnValue([catalogExercise as never]);

    const result = await hydrateExerciseMediaFromCatalog(sessionExercise);

    expect(mockFetchExercises).not.toHaveBeenCalled();
    expect(result).toEqual({
      ...sessionExercise,
      giftUrl: catalogExercise.giftUrl,
      videoUrl: catalogExercise.videoUrl,
    });
    expect(result.name).toBe("Bench Press");
    expect(result.sets).toEqual(sessionExercise.sets);
  });

  it("falls back to fetchExercises when peek is empty", async () => {
    mockPeekExerciseCatalog.mockReturnValue(null);
    mockFetchExercises.mockResolvedValue([catalogExercise as never]);

    const result = await hydrateExerciseMediaFromCatalog(sessionExercise);

    expect(mockFetchExercises).toHaveBeenCalledTimes(1);
    expect(result.videoUrl).toBe(catalogExercise.videoUrl);
    expect(result.giftUrl).toBe(catalogExercise.giftUrl);
  });

  it("returns original exercise when catalog has no match", async () => {
    mockPeekExerciseCatalog.mockReturnValue([
      { ...catalogExercise, id: "other" } as never,
    ]);

    const result = await hydrateExerciseMediaFromCatalog(sessionExercise);

    expect(result).toBe(sessionExercise);
  });

  it("returns original exercise when fetchExercises fails", async () => {
    mockPeekExerciseCatalog.mockReturnValue(null);
    mockFetchExercises.mockRejectedValue(new Error("offline"));

    const result = await hydrateExerciseMediaFromCatalog(sessionExercise);

    expect(result).toBe(sessionExercise);
  });

  it("does not overwrite an existing static imageUrl with catalog media", async () => {
    mockPeekExerciseCatalog.mockReturnValue([
      {
        ...catalogExercise,
        imageUrl: "https://cdn.example.com/catalog-other.png",
      } as never,
    ]);

    const result = await hydrateExerciseMediaFromCatalog(sessionExercise);

    expect(result.imageUrl).toBe(sessionExercise.imageUrl);
  });

  it("fills empty imageUrl from catalog static image when available", async () => {
    mockPeekExerciseCatalog.mockReturnValue([catalogExercise as never]);

    const result = await hydrateExerciseMediaFromCatalog({
      ...sessionExercise,
      imageUrl: undefined,
    });

    expect(result.imageUrl).toBe(catalogExercise.imageUrl);
    expect(result.videoUrl).toBe(catalogExercise.videoUrl);
  });
});
