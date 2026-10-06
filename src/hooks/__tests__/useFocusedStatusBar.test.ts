import { act, renderHook } from "@testing-library/react-native";
import { InteractionManager, Platform, StatusBar } from "react-native";

const focusCleanups: Array<() => void> = [];

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (cb: () => void | (() => void)) => {
    const cleanup = cb();
    if (typeof cleanup === "function") {
      focusCleanups.push(cleanup);
    }
  },
}));

import {
  nativeStackStatusBarStyle,
  themeBarStyle,
  useFocusedStatusBar,
  useOverlayStatusBar,
} from "../useFocusedStatusBar";

describe("useFocusedStatusBar", () => {
  const stackEntry = {
    barStyle: "dark-content" as const,
    translucent: true,
    backgroundColor: "transparent",
    hidden: false,
  };

  beforeEach(() => {
    focusCleanups.length = 0;
    jest.useFakeTimers();
    jest.spyOn(InteractionManager, "runAfterInteractions").mockImplementation((task) => {
      task();
      return { cancel: jest.fn() };
    });
    Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
    jest.spyOn(StatusBar, "pushStackEntry").mockReturnValue(stackEntry);
    jest.spyOn(StatusBar, "popStackEntry").mockImplementation(jest.fn());
    jest.spyOn(StatusBar, "replaceStackEntry").mockReturnValue(stackEntry);
    jest.spyOn(StatusBar, "setBarStyle").mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("maps theme to bar style", () => {
    expect(themeBarStyle(false)).toBe("dark-content");
    expect(themeBarStyle(true)).toBe("light-content");
    expect(nativeStackStatusBarStyle(false)).toBe("dark");
    expect(nativeStackStatusBarStyle(true)).toBe("light");
  });

  it("pushes an edge-to-edge stack entry on focus", () => {
    renderHook(() => useFocusedStatusBar("dark-content"));

    expect(StatusBar.pushStackEntry).toHaveBeenCalledWith({
      animated: true,
      hidden: false,
      barStyle: "dark-content",
      translucent: true,
      backgroundColor: "transparent",
    });
  });

  it("pops the stack entry on blur cleanup", () => {
    renderHook(() => useFocusedStatusBar("light-content"));
    focusCleanups.forEach((cleanup) => cleanup());

    expect(StatusBar.popStackEntry).toHaveBeenCalledWith(stackEntry);
  });

  it("re-asserts the stack entry in place on Android after screens delay", () => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "android",
    });
    renderHook(() => useFocusedStatusBar("dark-content"));

    expect(StatusBar.pushStackEntry).toHaveBeenCalledTimes(1);

    act(() => {
      jest.runAllTimers();
    });

    expect(StatusBar.replaceStackEntry).toHaveBeenCalled();
    expect(StatusBar.replaceStackEntry).toHaveBeenCalledWith(stackEntry, {
      animated: false,
      hidden: false,
      barStyle: "dark-content",
      translucent: true,
      backgroundColor: "transparent",
    });
    expect(StatusBar.setBarStyle).toHaveBeenCalledWith("dark-content", false);
    expect(StatusBar.popStackEntry).not.toHaveBeenCalled();
    expect(StatusBar.pushStackEntry).toHaveBeenCalledTimes(1);
  });

  it("does not push overlay entry when inactive", () => {
    renderHook(() => useOverlayStatusBar("dark-content", false));
    expect(StatusBar.pushStackEntry).not.toHaveBeenCalled();
  });

  it("pushes and pops overlay entry when active flips off", () => {
    const { rerender, unmount } = renderHook(
      ({ active }) => useOverlayStatusBar("light-content", active),
      { initialProps: { active: true } }
    );

    expect(StatusBar.pushStackEntry).toHaveBeenCalledWith({
      animated: true,
      hidden: false,
      barStyle: "light-content",
      translucent: true,
      backgroundColor: "transparent",
    });

    rerender({ active: false });
    expect(StatusBar.popStackEntry).toHaveBeenCalledWith(stackEntry);

    unmount();
  });
});
