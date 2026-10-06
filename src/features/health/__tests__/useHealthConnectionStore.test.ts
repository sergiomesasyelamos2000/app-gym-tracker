import { act, renderHook, waitFor } from "@testing-library/react-native";

const mockGetStatus = jest.fn();
const mockRequest = jest.fn();

jest.mock("../healthClient", () => ({
  getHealthAuthorizationStatus: () => mockGetStatus(),
  requestHealthAuthorization: () => mockRequest(),
}));

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

import { useHealthConnectionStore } from "../useHealthConnectionStore";

describe("useHealthConnectionStore", () => {
  beforeEach(() => {
    mockGetStatus.mockReset();
    mockRequest.mockReset();
    act(() => {
      useHealthConnectionStore.setState({
        status: "undetermined",
        lastCheckedAt: null,
        hasRequestedAuthorization: false,
        writeWorkoutsToHub: true,
        showRestHints: true,
        lastDismissedSuggestionAt: null,
      });
    });
  });

  it("sets hasRequestedAuthorization only on connect", async () => {
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
});
