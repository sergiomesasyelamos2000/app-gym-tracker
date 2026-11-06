import React from "react";
import { act, render } from "@testing-library/react-native";
import type { ExerciseRequestDto } from "@sergiomesasyelamos2000/shared";
import ExerciseMedia from "../ExerciseMedia";
import {
  ensureExerciseMediaIndex,
  peekExerciseLocalMedia,
  subscribeExerciseMedia,
} from "../../../../services/exerciseMediaCache";
import NetInfo from "@react-native-community/netinfo";

jest.mock("../../../../services/exerciseMediaCache", () => ({
  ensureExerciseMediaIndex: jest.fn().mockResolvedValue(undefined),
  peekExerciseLocalMedia: jest.fn(() => ({
    videoUri: null,
    gifUri: null,
    staticUri: null,
  })),
  subscribeExerciseMedia: jest.fn(() => () => undefined),
  exerciseMediaDirectoryUri: () => "file:///docs/exercise-media/",
}));

jest.mock("@react-native-community/netinfo", () => ({
  fetch: jest.fn(),
  addEventListener: jest.fn(() => () => undefined),
}));

jest.mock("react-native-webview", () => {
  const ReactNative = require("react-native");
  return {
    WebView: ReactNative.View,
  };
});

jest.mock("react-native-vector-icons/MaterialIcons", () => "Icon");

const mockedPeek = peekExerciseLocalMedia as jest.MockedFunction<
  typeof peekExerciseLocalMedia
>;
const mockedNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;

function exercise(
  partial: Partial<ExerciseRequestDto> & { id: string }
): ExerciseRequestDto {
  return {
    name: "Bench",
    muscularGroup: "chest",
    ...partial,
  } as ExerciseRequestDto;
}

describe("ExerciseMedia", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockedPeek.mockReturnValue({
      videoUri: null,
      gifUri: null,
      staticUri: null,
    });
    mockedNetInfo.fetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    } as never);
    (ensureExerciseMediaIndex as jest.Mock).mockResolvedValue(undefined);
    (subscribeExerciseMedia as jest.Mock).mockReturnValue(() => undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("shows fallback when remote video errors and no later media exists", async () => {
    const { getByTestId, findByTestId } = render(
      <ExerciseMedia
        exercise={exercise({
          id: "e1",
          videoUrl: "https://cdn.example.com/v.mp4",
        })}
        style={{ width: 100, height: 100 }}
      />
    );

    await act(async () => {
      await Promise.resolve();
    });

    const video = await findByTestId("exercise-media-video");
    const webView = video.children[0] as { props: { onMessage: Function } };
    act(() => {
      webView.props.onMessage({
        nativeEvent: { data: JSON.stringify({ error: true }) },
      });
    });

    expect(getByTestId("exercise-media-fallback")).toBeTruthy();
  });

  it("advances to local gif when video errors", async () => {
    mockedPeek.mockReturnValue({
      videoUri: null,
      gifUri: "file:///docs/exercise-media/e1/gif.gif",
      staticUri: null,
    });
    mockedNetInfo.fetch.mockResolvedValue({
      isConnected: false,
      isInternetReachable: false,
    } as never);

    const { findByTestId } = render(
      <ExerciseMedia
        exercise={exercise({
          id: "e1",
          videoUrl: "https://cdn.example.com/v.mp4",
          giftUrl: "https://cdn.example.com/g.gif",
        } as never)}
        style={{ width: 100, height: 100 }}
      />
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(await findByTestId("exercise-media-gif")).toBeTruthy();
  });

  it("advances after 8s without ready message", async () => {
    const onLoadEnd = jest.fn();
    const { findByTestId, getByTestId } = render(
      <ExerciseMedia
        exercise={exercise({
          id: "e1",
          videoUrl: "https://cdn.example.com/v.mp4",
        })}
        style={{ width: 100, height: 100 }}
        onLoadEnd={onLoadEnd}
      />
    );

    await act(async () => {
      await Promise.resolve();
    });
    await findByTestId("exercise-media-video");

    act(() => {
      jest.advanceTimersByTime(8000);
    });

    expect(getByTestId("exercise-media-fallback")).toBeTruthy();
  });

  it("calls onLoadEnd when ready message arrives", async () => {
    const onLoadEnd = jest.fn();
    const { findByTestId } = render(
      <ExerciseMedia
        exercise={exercise({
          id: "e1",
          videoUrl: "https://cdn.example.com/v.mp4",
        })}
        style={{ width: 100, height: 100 }}
        onLoadEnd={onLoadEnd}
      />
    );

    await act(async () => {
      await Promise.resolve();
    });
    const video = await findByTestId("exercise-media-video");
    const webView = video.children[0] as { props: { onMessage: Function } };
    act(() => {
      webView.props.onMessage({
        nativeEvent: { data: JSON.stringify({ ready: true }) },
      });
    });

    expect(onLoadEnd).toHaveBeenCalled();
  });
});
