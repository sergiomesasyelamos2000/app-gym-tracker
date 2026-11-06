import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import CachedExerciseImage from "../CachedExerciseImage";
import { peekCachedStaticUri } from "../../services/exerciseMediaCache";

jest.mock("../../services/exerciseMediaCache", () => ({
  peekCachedStaticUri: jest.fn(() => null),
}));

const mockedPeek = peekCachedStaticUri as jest.MockedFunction<
  typeof peekCachedStaticUri
>;

describe("CachedExerciseImage", () => {
  beforeEach(() => {
    mockedPeek.mockReturnValue(null);
  });

  it("uses file:// uri directly", () => {
    const { getByTestId } = render(
      <CachedExerciseImage
        imageUrl="file:///docs/exercise-media/e1/static.jpg"
        style={{ width: 40, height: 40 }}
      />
    );
    const image = getByTestId("cached-exercise-image");
    expect(image.props.source).toEqual({
      uri: "file:///docs/exercise-media/e1/static.jpg",
    });
  });

  it("swaps https url for local cached static file", () => {
    mockedPeek.mockReturnValue("file:///docs/exercise-media/e1/static.jpg");
    const { getByTestId } = render(
      <CachedExerciseImage
        imageUrl="https://cdn.example.com/e1.jpg"
        style={{ width: 40, height: 40 }}
      />
    );
    expect(getByTestId("cached-exercise-image").props.source).toEqual({
      uri: "file:///docs/exercise-media/e1/static.jpg",
    });
  });

  it("falls back to not-image on error", () => {
    const { getByTestId } = render(
      <CachedExerciseImage
        imageUrl="https://cdn.example.com/broken.jpg"
        style={{ width: 40, height: 40 }}
      />
    );
    fireEvent(getByTestId("cached-exercise-image"), "error");
    expect(getByTestId("cached-exercise-image-fallback")).toBeTruthy();
  });
});
