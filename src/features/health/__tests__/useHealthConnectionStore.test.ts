import { act, renderHook, waitFor } from "@testing-library/react-native";

const mockGetStatus = jest.fn();
const mockRequest = jest.fn();
const mockIsAvailable = jest.fn();

jest.mock("../healthClient", () => ({
  getHealthAuthorizationStatus: () => mockGetStatus(),
  requestHealthAuthorization: () => mockRequest(),
  getHealthClient: () => ({
    isAvailable: () => mockIsAvailable(),
  }),
}));

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

import { useHealthConnectionStore } from "../useHealthConnectionStore";

describe("useHealthConnectionStore", () => {
  beforeEach(() => {
    mockGetStatus.mockReset();
    mockRequest.mockReset();
    mockIsAvailable.mockReset();
    mockIsAvailable.mockResolvedValue(true);
    act(() => {
      useHealthConnectionStore.setState({
        status: "undetermined",
        lastCheckedAt: null,
        hasRequestedAuthorization: false,
        writeWorkoutsToHub: true,
        showRestHints: true,
        lastDismissedSuggestionAt: null,
        finishPromptDismissed: false,
      });
    });
  });

  it("sets hasRequestedAuthorization only on successful connect path", async () => {
    mockGetStatus.mockResolvedValue("undetermined");
    mockRequest.mockResolvedValue("granted");

    const { result } = renderHook(() => useHealthConnectionStore());

    await act(async () => {
      await result.current.refreshStatus();
    });

    expect(mockRequest).not.toHaveBeenCalled();
    expect(result.current.hasRequestedAuthorization).toBe(false);

    await act(async () => {
      await result.current.connect();
    });

    await waitFor(() => {
      expect(result.current.hasRequestedAuthorization).toBe(true);
      expect(result.current.status).toBe("granted");
    });
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it("does not mark requested when hub module is unavailable", async () => {
    mockIsAvailable.mockResolvedValue(false);
    const { result } = renderHook(() => useHealthConnectionStore());

    await act(async () => {
      const status = await result.current.connect();
      expect(status).toBe("unavailable");
    });

    expect(mockRequest).not.toHaveBeenCalled();
    expect(result.current.hasRequestedAuthorization).toBe(false);
    expect(result.current.status).toBe("unavailable");
    expect(result.current.canReadFromHub()).toBe(false);
    expect(result.current.canWriteToHub()).toBe(false);
  });

  it("allows read after connect even when write status is denied", async () => {
    mockRequest.mockResolvedValue("denied");
    const { result } = renderHook(() => useHealthConnectionStore());

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.hasRequestedAuthorization).toBe(true);
    expect(result.current.canReadFromHub()).toBe(true);
    expect(result.current.canWriteToHub()).toBe(false);
  });

  it("enables workout sync by default after connect and can disconnect", async () => {
    mockRequest.mockResolvedValue("granted");
    const { result } = renderHook(() => useHealthConnectionStore());

    act(() => {
      result.current.setWriteWorkoutsToHub(false);
    });

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.writeWorkoutsToHub).toBe(true);
    expect(result.current.shouldOfferFinishPrompt()).toBe(false);

    act(() => {
      result.current.disconnect();
    });

    expect(result.current.hasRequestedAuthorization).toBe(false);
    expect(result.current.writeWorkoutsToHub).toBe(false);
    expect(result.current.shouldOfferFinishPrompt()).toBe(true);
  });

  it("stops offering finish prompt after dismiss", () => {
    const { result } = renderHook(() => useHealthConnectionStore());
    expect(result.current.shouldOfferFinishPrompt()).toBe(true);

    act(() => {
      result.current.dismissFinishPrompt();
    });

    expect(result.current.shouldOfferFinishPrompt()).toBe(false);
  });
});
