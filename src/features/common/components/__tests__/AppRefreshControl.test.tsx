import React from "react";
import { Platform } from "react-native";
import { act, render } from "@testing-library/react-native";
import { AppRefreshControl } from "../AppRefreshControl";

jest.mock("react-native-gesture-handler", () => {
  const React = require("react");
  const { RefreshControl } = require("react-native");
  const MockGhRefreshControl = jest.fn((props: Record<string, unknown>) => (
    <RefreshControl {...props} />
  ));
  return {
    RefreshControl: MockGhRefreshControl,
  };
});

const themeState = {
  primary: "#6C3BAA",
  card: "#FFFFFF",
};

jest.mock("../../../../contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: themeState,
  }),
}));

function getNativeRefreshControl(
  utils: ReturnType<typeof render>
): { props: Record<string, unknown> } {
  const { RefreshControl } = require("react-native");
  return utils.UNSAFE_getByType(RefreshControl);
}

function flushDeferredTintFrame() {
  act(() => {
    jest.advanceTimersByTime(16);
  });
}

describe("AppRefreshControl", () => {
  const originalOs = Platform.OS;

  beforeEach(() => {
    jest.useFakeTimers();
    themeState.primary = "#6C3BAA";
    themeState.card = "#FFFFFF";
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => "ios",
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => originalOs,
    });
  });

  it("on iOS omits tintColor on first commit and applies theme primary next frame", () => {
    const utils = render(
      <AppRefreshControl refreshing={false} onRefresh={jest.fn()} />
    );
    const first = getNativeRefreshControl(utils);
    expect(first.props.tintColor).toBeUndefined();
    expect(first.props.colors).toEqual(["#6C3BAA"]);
    expect(first.props.progressBackgroundColor).toBe("#FFFFFF");

    flushDeferredTintFrame();

    expect(getNativeRefreshControl(utils).props.tintColor).toBe("#6C3BAA");
  });

  it("defers explicit tintColor override the same way on iOS", () => {
    const utils = render(
      <AppRefreshControl
        refreshing={false}
        onRefresh={jest.fn()}
        tintColor="#FFFFFF"
      />
    );
    expect(getNativeRefreshControl(utils).props.tintColor).toBeUndefined();
    // colors follows spinnerColor (tint override) unless colors is passed
    expect(getNativeRefreshControl(utils).props.colors).toEqual(["#FFFFFF"]);

    flushDeferredTintFrame();

    expect(getNativeRefreshControl(utils).props.tintColor).toBe("#FFFFFF");
  });

  it("updates deferred tint when theme primary changes without clearing to undefined", () => {
    const utils = render(
      <AppRefreshControl refreshing={false} onRefresh={jest.fn()} />
    );
    flushDeferredTintFrame();
    expect(getNativeRefreshControl(utils).props.tintColor).toBe("#6C3BAA");

    themeState.primary = "#A78BFA";
    utils.rerender(
      <AppRefreshControl refreshing={false} onRefresh={jest.fn()} />
    );

    expect(getNativeRefreshControl(utils).props.tintColor).toBe("#6C3BAA");

    flushDeferredTintFrame();

    expect(getNativeRefreshControl(utils).props.tintColor).toBe("#A78BFA");
  });

  it("applies the same two-phase tint on the gestureHandler control", () => {
    const {
      RefreshControl: MockGhRefreshControl,
    } = require("react-native-gesture-handler");
    MockGhRefreshControl.mockClear();

    const utils = render(
      <AppRefreshControl
        refreshing={false}
        onRefresh={jest.fn()}
        gestureHandler
      />
    );

    expect(MockGhRefreshControl).toHaveBeenCalled();
    expect(MockGhRefreshControl.mock.calls[0][0].tintColor).toBeUndefined();

    flushDeferredTintFrame();

    const lastCall =
      MockGhRefreshControl.mock.calls[
        MockGhRefreshControl.mock.calls.length - 1
      ][0];
    expect(lastCall.tintColor).toBe("#6C3BAA");
    expect(getNativeRefreshControl(utils).props.tintColor).toBe("#6C3BAA");
  });

  it("on Android applies tintColor and colors immediately", () => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => "android",
    });

    const utils = render(
      <AppRefreshControl refreshing={false} onRefresh={jest.fn()} />
    );
    const control = getNativeRefreshControl(utils);
    expect(control.props.tintColor).toBe("#6C3BAA");
    expect(control.props.colors).toEqual(["#6C3BAA"]);

    flushDeferredTintFrame();

    expect(getNativeRefreshControl(utils).props.tintColor).toBe("#6C3BAA");
  });

  it("keeps tintColor when refreshing toggles after the deferred frame", () => {
    const onRefresh = jest.fn();
    const utils = render(
      <AppRefreshControl refreshing={false} onRefresh={onRefresh} />
    );
    flushDeferredTintFrame();
    expect(getNativeRefreshControl(utils).props.tintColor).toBe("#6C3BAA");

    utils.rerender(
      <AppRefreshControl refreshing={true} onRefresh={onRefresh} />
    );

    expect(getNativeRefreshControl(utils).props.tintColor).toBe("#6C3BAA");
  });

  it("cancels a pending tint frame when color changes again before flush", () => {
    const utils = render(
      <AppRefreshControl
        refreshing={false}
        onRefresh={jest.fn()}
        tintColor="#111111"
      />
    );

    utils.rerender(
      <AppRefreshControl
        refreshing={false}
        onRefresh={jest.fn()}
        tintColor="#222222"
      />
    );

    flushDeferredTintFrame();

    expect(getNativeRefreshControl(utils).props.tintColor).toBe("#222222");
  });
});
