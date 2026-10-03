import { renderHook } from "@testing-library/react-native";
import { Platform, StatusBar } from "react-native";

const focusCleanups: Array<() => void> = [];

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (cb: () => void | (() => void)) => {
    const cleanup = cb();
    if (typeof cleanup === "function") {
      focusCleanups.push(cleanup);
    }
  },
}));

import { useFocusedStatusBar } from "../useFocusedStatusBar";

describe("useFocusedStatusBar", () => {
  beforeEach(() => {
    focusCleanups.length = 0;
    Object.defineProperty(Platform, "OS", { configurable: true, value: "android" });
    jest.spyOn(StatusBar, "setHidden").mockImplementation(jest.fn());
    jest.spyOn(StatusBar, "setBarStyle").mockImplementation(jest.fn());
    jest.spyOn(StatusBar, "setTranslucent").mockImplementation(jest.fn());
    jest.spyOn(StatusBar, "setBackgroundColor").mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("keeps the status bar visible and edge-to-edge friendly on focus", () => {
    renderHook(() => useFocusedStatusBar("dark-content"));

    expect(StatusBar.setHidden).toHaveBeenCalledWith(false);
    expect(StatusBar.setBarStyle).toHaveBeenCalledWith("dark-content", true);
    expect(StatusBar.setTranslucent).toHaveBeenCalledWith(true);
    expect(StatusBar.setBackgroundColor).toHaveBeenCalledWith("transparent");
  });

  it("keeps the status bar visible on blur cleanup", () => {
    renderHook(() => useFocusedStatusBar("light-content"));
    focusCleanups.forEach((cleanup) => cleanup());

    expect(StatusBar.setHidden).toHaveBeenCalledWith(false);
  });
});
