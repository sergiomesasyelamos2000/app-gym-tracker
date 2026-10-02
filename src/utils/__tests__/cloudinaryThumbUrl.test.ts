import {
  LIST_THUMB_TRANSFORM,
  toCloudinaryListThumbUrl,
} from "../cloudinaryThumbUrl";

describe("toCloudinaryListThumbUrl", () => {
  it("returns null for null/undefined", () => {
    expect(toCloudinaryListThumbUrl(null)).toBeNull();
    expect(toCloudinaryListThumbUrl(undefined)).toBeNull();
  });

  it("passes through empty string", () => {
    expect(toCloudinaryListThumbUrl("")).toBe("");
    expect(toCloudinaryListThumbUrl("   ")).toBe("");
  });

  it("passes through data URIs", () => {
    const dataUri = "data:image/png;base64,abc";
    expect(toCloudinaryListThumbUrl(dataUri)).toBe(dataUri);
  });

  it("passes through non-Cloudinary http hosts", () => {
    const url = "https://cdn.exercisedb.dev/image/foo.png";
    expect(toCloudinaryListThumbUrl(url)).toBe(url);
  });

  it("inserts list transform after /image/upload/", () => {
    const url =
      "https://res.cloudinary.com/demo/image/upload/v1/exercises/static/bench.png";
    expect(toCloudinaryListThumbUrl(url)).toBe(
      `https://res.cloudinary.com/demo/image/upload/${LIST_THUMB_TRANSFORM}/v1/exercises/static/bench.png`
    );
  });

  it("does not double-insert the list transform", () => {
    const url = `https://res.cloudinary.com/demo/image/upload/${LIST_THUMB_TRANSFORM}/v1/foo.png`;
    expect(toCloudinaryListThumbUrl(url)).toBe(url);
  });

  it("chains onto an existing transform segment", () => {
    const url =
      "https://res.cloudinary.com/demo/image/upload/c_limit,w_800/v1/foo.png";
    expect(toCloudinaryListThumbUrl(url)).toBe(
      `https://res.cloudinary.com/demo/image/upload/${LIST_THUMB_TRANSFORM}/c_limit,w_800/v1/foo.png`
    );
  });
});
