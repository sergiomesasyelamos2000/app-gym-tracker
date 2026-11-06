import {
  escapeMediaUrl,
  pickExerciseMediaSource,
} from "../pickExerciseMediaSource";

describe("pickExerciseMediaSource", () => {
  const empty = { video: null, gif: null, static: null };

  it("offline with local gif ignores remote video", () => {
    const result = pickExerciseMediaSource({
      isOnline: false,
      local: {
        video: null,
        gif: "file:///gif.gif",
        static: "file:///static.jpg",
      },
      remote: {
        video: "https://cdn.example.com/v.mp4",
        gif: "https://cdn.example.com/g.gif",
        static: "https://cdn.example.com/s.jpg",
      },
    });

    expect(result).toEqual({
      status: "ready",
      candidates: [
        { type: "gif", uri: "file:///gif.gif", local: true },
        { type: "static", uri: "file:///static.jpg" },
        { type: "static", uri: null },
      ],
    });
  });

  it("online includes local then remote for each media kind", () => {
    const result = pickExerciseMediaSource({
      isOnline: true,
      local: {
        video: null,
        gif: "file:///gif.gif",
        static: "file:///static.jpg",
      },
      remote: {
        video: "https://cdn.example.com/v.mp4",
        gif: "https://cdn.example.com/g.gif",
        static: "https://cdn.example.com/s.jpg",
      },
    });

    expect(result).toEqual({
      status: "ready",
      candidates: [
        { type: "video", uri: "https://cdn.example.com/v.mp4", local: false },
        { type: "gif", uri: "file:///gif.gif", local: true },
        { type: "gif", uri: "https://cdn.example.com/g.gif", local: false },
        { type: "static", uri: "file:///static.jpg" },
        { type: "static", uri: "https://cdn.example.com/s.jpg" },
        { type: "static", uri: null },
      ],
    });
  });

  it("returns a single null static candidate when no urls exist", () => {
    expect(
      pickExerciseMediaSource({
        isOnline: true,
        local: empty,
        remote: empty,
      })
    ).toEqual({
      status: "ready",
      candidates: [{ type: "static", uri: null }],
    });
  });

  it("isOnline null with local gif is ready and local-only", () => {
    const result = pickExerciseMediaSource({
      isOnline: null,
      local: { video: null, gif: "file:///gif.gif", static: null },
      remote: {
        video: "https://cdn.example.com/v.mp4",
        gif: "https://cdn.example.com/g.gif",
        static: "https://cdn.example.com/s.jpg",
      },
    });

    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.candidates).toEqual([
        { type: "gif", uri: "file:///gif.gif", local: true },
        { type: "static", uri: null },
      ]);
    }
  });

  it("isOnline null with only remote urls is pending", () => {
    expect(
      pickExerciseMediaSource({
        isOnline: null,
        local: empty,
        remote: {
          video: "https://cdn.example.com/v.mp4",
          gif: null,
          static: "https://cdn.example.com/s.jpg",
        },
      })
    ).toEqual({ status: "pending" });
  });
});

describe("escapeMediaUrl", () => {
  it("accepts http(s) and file uris", () => {
    expect(escapeMediaUrl("https://cdn.example.com/a.gif")).toBe(
      "https://cdn.example.com/a.gif"
    );
    expect(escapeMediaUrl("file:///cache/a.gif")).toBe("file:///cache/a.gif");
  });

  it("rejects quotes and angle brackets", () => {
    expect(escapeMediaUrl('https://x.com/"onclick')).toBeNull();
    expect(escapeMediaUrl("https://x.com/<script>")).toBeNull();
    expect(escapeMediaUrl("javascript:alert(1)")).toBeNull();
  });
});
