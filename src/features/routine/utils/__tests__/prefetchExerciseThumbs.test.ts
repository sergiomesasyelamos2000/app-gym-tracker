import { Image } from "react-native";
import { LIST_THUMB_TRANSFORM } from "../../../../utils/cloudinaryThumbUrl";
import {
  clearPrefetchedExerciseThumbs,
  prefetchExerciseThumbBatch,
  waitForExerciseThumbBatch,
} from "../prefetchExerciseThumbs";

jest.mock("react-native", () => ({
  Image: {
    prefetch: jest.fn(() => Promise.resolve(true)),
  },
}));

jest.mock("../../../../services/exerciseCatalogCache", () => ({
  peekExerciseCatalog: jest.fn(() => null),
}));

describe("prefetchExerciseThumbBatch", () => {
  beforeEach(() => {
    clearPrefetchedExerciseThumbs();
    (Image.prefetch as jest.Mock).mockClear();
    (Image.prefetch as jest.Mock).mockImplementation(() =>
      Promise.resolve(true)
    );
  });

  it("prefetches Cloudinary list thumb URLs, not the raw catalog URL", () => {
    const raw =
      "https://res.cloudinary.com/demo/image/upload/v1/exercises/static/bench.png";

    prefetchExerciseThumbBatch([{ imageUrl: raw }], { count: 1 });

    expect(Image.prefetch).toHaveBeenCalledTimes(1);
    expect(Image.prefetch).toHaveBeenCalledWith(
      `https://res.cloudinary.com/demo/image/upload/${LIST_THUMB_TRANSFORM}/v1/exercises/static/bench.png`
    );
  });

  it("dedupes the same thumb URI across calls", () => {
    const raw =
      "https://res.cloudinary.com/demo/image/upload/v1/exercises/static/bench.png";

    prefetchExerciseThumbBatch([{ imageUrl: raw }]);
    prefetchExerciseThumbBatch([{ imageUrl: raw }]);

    expect(Image.prefetch).toHaveBeenCalledTimes(1);
  });

  it("skips completed URIs after the prefetch promise resolves", async () => {
    const raw =
      "https://res.cloudinary.com/demo/image/upload/v1/exercises/static/bench.png";

    prefetchExerciseThumbBatch([{ imageUrl: raw }]);
    await Promise.resolve();
    await Promise.resolve();

    prefetchExerciseThumbBatch([{ imageUrl: raw }]);

    expect(Image.prefetch).toHaveBeenCalledTimes(1);
  });

  it("skips data URIs and respects startIndex/limit", () => {
    prefetchExerciseThumbBatch(
      [
        { imageUrl: "data:image/png;base64,abc" },
        {
          imageUrl:
            "https://res.cloudinary.com/demo/image/upload/v1/a.png",
        },
        {
          imageUrl:
            "https://res.cloudinary.com/demo/image/upload/v1/b.png",
        },
      ],
      { startIndex: 1, count: 10, limit: 1 }
    );

    expect(Image.prefetch).toHaveBeenCalledTimes(1);
    expect((Image.prefetch as jest.Mock).mock.calls[0][0]).toContain("a.png");
  });
});

describe("waitForExerciseThumbBatch", () => {
  beforeEach(() => {
    clearPrefetchedExerciseThumbs();
    (Image.prefetch as jest.Mock).mockClear();
  });

  it("resolves when prefetch completes", async () => {
    let resolvePrefetch!: (value: boolean) => void;
    (Image.prefetch as jest.Mock).mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          resolvePrefetch = resolve;
        })
    );

    const waitPromise = waitForExerciseThumbBatch(
      [
        {
          imageUrl:
            "https://res.cloudinary.com/demo/image/upload/v1/a.png",
        },
      ],
      { count: 1, timeoutMs: 2000 }
    );

    resolvePrefetch(true);
    await expect(waitPromise).resolves.toBeUndefined();
  });

  it("resolves after timeout even if prefetch is slow", async () => {
    (Image.prefetch as jest.Mock).mockImplementation(
      () => new Promise<boolean>(() => {})
    );

    const started = Date.now();
    await waitForExerciseThumbBatch(
      [
        {
          imageUrl:
            "https://res.cloudinary.com/demo/image/upload/v1/a.png",
        },
      ],
      { count: 1, timeoutMs: 50 }
    );
    expect(Date.now() - started).toBeLessThan(400);
  });
});
