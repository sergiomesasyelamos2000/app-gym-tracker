import { act } from "@testing-library/react-native";
import { useNavigationStore } from "../useNavigationStore";

describe("useNavigationStore home gate", () => {
  beforeEach(() => {
    act(() => {
      useNavigationStore.setState({
        hiddenTabs: {},
        homeReady: false,
        homeGateEpoch: 0,
      });
    });
  });

  it("starts with homeReady false and epoch 0", () => {
    const state = useNavigationStore.getState();
    expect(state.homeReady).toBe(false);
    expect(state.homeGateEpoch).toBe(0);
  });

  it("markHomeReady(0) sets ready", () => {
    act(() => {
      useNavigationStore.getState().markHomeReady(0);
    });
    expect(useNavigationStore.getState().homeReady).toBe(true);
  });

  it("resetHomeGate clears ready and increments epoch", () => {
    act(() => {
      useNavigationStore.getState().markHomeReady(0);
      useNavigationStore.getState().resetHomeGate();
    });
    const state = useNavigationStore.getState();
    expect(state.homeReady).toBe(false);
    expect(state.homeGateEpoch).toBe(1);
  });

  it("markHomeReady with a stale epoch is a no-op", () => {
    act(() => {
      useNavigationStore.getState().resetHomeGate();
      useNavigationStore.getState().markHomeReady(0);
    });
    expect(useNavigationStore.getState().homeReady).toBe(false);
    expect(useNavigationStore.getState().homeGateEpoch).toBe(1);
  });

  it("setTabVisibility and resetAllTabs do not change epoch", () => {
    act(() => {
      useNavigationStore.getState().setTabVisibility("Macros", false);
      useNavigationStore.getState().resetAllTabs();
    });
    expect(useNavigationStore.getState().homeGateEpoch).toBe(0);
    expect(useNavigationStore.getState().homeReady).toBe(false);
  });
});
