import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";
import CachedExerciseImage from "../CachedExerciseImage";
import {
  ensureExerciseMediaIndex,
  peekCachedStaticUri,
  subscribeExerciseMedia,
} from "../../services/exerciseMediaCache";

jest.mock("../../services/exerciseMediaCache", () => ({
  peekCachedStaticUri: jest.fn(() => null),
  ensureExerciseMediaIndex: jest.fn(() => Promise.resolve()),
  subscribeExerciseMedia: jest.fn(() => () => undefined),
}));

const mockedPeek = peekCachedStaticUri as jest.MockedFunction<
  typeof peekCachedStaticUri
>;
const mockedEnsure = ensureExerciseMediaIndex as jest.MockedFunction<
  typeof ensureExerciseMediaIndex
>;
const mockedSubscribe = subscribeExerciseMedia as jest.MockedFunction<
  typeof subscribeExerciseMedia
>;

describe("CachedExerciseImage", () => {
  beforeEach(() => {
    mockedPeek.mockReturnValue(null);
    mockedEnsure.mockResolvedValue(undefined);
    mockedSubscribe.mockReturnValue(() => undefined);
  });

  it("uses file:// uri directly", async () => {
    const { getByTestId } = render(
      <CachedExerciseImage
        imageUrl="file:///docs/exercise-media/e1/static.jpg"
        style={{ width: 40, height: 40 }}
      />
    );
    await act(async () => {
      await Promise.resolve();
    });
    const image = getByTestId("cached-exercise-image");
    expect(image.props.source).toEqual({
      uri: "file:///docs/exercise-media/e1/static.jpg",
    });
  });

  it("swaps https url for local cached static file", async () => {
    mockedPeek.mockReturnValue("file:///docs/exercise-media/e1/static.jpg");
    const { getByTestId } = render(
      <CachedExerciseImage
        imageUrl="https://cdn.example.com/e1.jpg"
        style={{ width: 40, height: 40 }}
      />
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(getByTestId("cached-exercise-image").props.source).toEqual({
      uri: "file:///docs/exercise-media/e1/static.jpg",
    });
  });

  it("re-resolves to file:// when media cache notifies", async () => {
    let listener: (() => void) | undefined;
    mockedSubscribe.mockImplementation((fn) => {
      listener = fn;
      return () => undefined;
    });
    mockedPeek.mockReturnValue(null);

    const { getByTestId, findByTestId } = render(
      <CachedExerciseImage
        imageUrl="https://cdn.example.com/e1.jpg"
        style={{ width: 40, height: 40 }}
      />
    );
    await act(async () => {
      await Promise.resolve();
    });

    expect(getByTestId("cached-exercise-image").props.source.uri).toBe(
      "https://cdn.example.com/e1.jpg"
    );

    mockedPeek.mockReturnValue("file:///docs/exercise-media/e1/static.jpg");
    await act(async () => {
      listener?.();
    });

    const image = await findByTestId("cached-exercise-image");
    expect(image.props.source).toEqual({
      uri: "file:///docs/exercise-media/e1/static.jpg",
    });
  });

  it("falls back to not-image on error", async () => {
    const { getByTestId } = render(
      <CachedExerciseImage
        imageUrl="https://cdn.example.com/broken.jpg"
        style={{ width: 40, height: 40 }}
      />
    );
    await act(async () => {
      await Promise.resolve();
    });
    fireEvent(getByTestId("cached-exercise-image"), "error");
    expect(getByTestId("cached-exercise-image-fallback")).toBeTruthy();
  });
});
