import { enrichSessionExercisesWithCatalogImages } from "../enrichSessionExerciseImages";
import { clearExerciseImageLookupCache } from "../exerciseImageLookupCache";

jest.mock("../../../../services/exerciseService", () => ({
  fetchExercises: jest.fn().mockResolvedValue([
    {
      id: "ex-1",
      name: "Bench",
      imageUrl: "https://cdn.example.com/bench.png",
    },
  ]),
}));

jest.mock("../normalizeExerciseImage", () => ({
  getStaticExerciseImageUrl: jest.fn((exercise: { imageUrl?: string }) =>
    exercise.imageUrl ?? null
  ),
}));

describe("enrichSessionExercisesWithCatalogImages", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearExerciseImageLookupCache();
  });

  it("fills missing imageUrl from catalog by exerciseId", async () => {
    const result = await enrichSessionExercisesWithCatalogImages([
      { exerciseId: "ex-1", name: "Bench", sets: [] },
      {
        exerciseId: "ex-2",
        name: "Unknown",
        imageUrl: "https://keep.me/a.png",
        sets: [],
      },
    ]);

    expect(result[0].imageUrl).toBe("https://cdn.example.com/bench.png");
    expect(result[1].imageUrl).toBe("https://keep.me/a.png");
  });
});
