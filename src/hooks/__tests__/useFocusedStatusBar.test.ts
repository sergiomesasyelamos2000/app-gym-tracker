import { renderHook } from "@testing-library/react-native";
import { StatusBar } from "react-native";

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
  const stackEntry = {
    barStyle: "dark-content" as const,
    translucent: true,
    backgroundColor: "transparent",
    hidden: false,
  };

  beforeEach(() => {
    focusCleanups.length = 0;
    jest.spyOn(StatusBar, "pushStackEntry").mockReturnValue(stackEntry);
    jest.spyOn(StatusBar, "popStackEntry").mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
});
