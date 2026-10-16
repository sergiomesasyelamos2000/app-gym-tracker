import {
  HEALTH_CONNECT_PACKAGE,
  HEALTH_CONNECT_PLAY_STORE_MARKET_URL,
  HEALTH_CONNECT_PLAY_STORE_WEB_URL,
  classifyHealthConnectSdkStatus,
  openHealthConnectManage,
  openHealthConnectPlayStore,
  probeHealthConnectAvailability,
} from "../androidHealthConnectActions";

const mockOpenURL = jest.fn();
const mockCanOpenURL = jest.fn();
const mockOpenSettings = jest.fn();

jest.mock("react-native", () => ({
  Platform: { OS: "android" },
  Linking: {
    openURL: (...args: unknown[]) => mockOpenURL(...args),
    canOpenURL: (...args: unknown[]) => mockCanOpenURL(...args),
    openSettings: (...args: unknown[]) => mockOpenSettings(...args),
  },
}));

describe("classifyHealthConnectSdkStatus", () => {
  it("maps SDK status codes like Hevy's HC availability states", () => {
    expect(classifyHealthConnectSdkStatus(3)).toBe("available");
    expect(classifyHealthConnectSdkStatus(2)).toBe("update_required");
    expect(classifyHealthConnectSdkStatus(1)).toBe("unavailable");
    expect(classifyHealthConnectSdkStatus(99)).toBe("unavailable");
  });
});

describe("openHealthConnectPlayStore", () => {
  beforeEach(() => {
    mockOpenURL.mockReset();
    mockCanOpenURL.mockReset();
    mockOpenURL.mockResolvedValue(undefined);
  });

  it("opens the Health Connect Play Store listing via market URL", async () => {
    mockCanOpenURL.mockResolvedValue(true);
    const ok = await openHealthConnectPlayStore();
    expect(ok).toBe(true);
    expect(mockOpenURL).toHaveBeenCalledWith(
      HEALTH_CONNECT_PLAY_STORE_MARKET_URL
    );
    expect(HEALTH_CONNECT_PACKAGE).toBe("com.google.android.apps.healthdata");
  });

  it("falls back to the web Play Store URL", async () => {
    mockCanOpenURL.mockResolvedValue(false);
    const ok = await openHealthConnectPlayStore();
    expect(ok).toBe(true);
    expect(mockOpenURL).toHaveBeenCalledWith(
      HEALTH_CONNECT_PLAY_STORE_WEB_URL
    );
  });
});

describe("probeHealthConnectAvailability", () => {
  it("returns unavailable when the module is missing", async () => {
    await expect(probeHealthConnectAvailability(null)).resolves.toBe(
      "unavailable"
    );
  });

  it("classifies getSdkStatus results", async () => {
    await expect(
      probeHealthConnectAvailability({
        getSdkStatus: async () => 2,
        SdkAvailabilityStatus: {
          SDK_UNAVAILABLE: 1,
          SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED: 2,
          SDK_AVAILABLE: 3,
        },
      })
    ).resolves.toBe("update_required");
  });
});

describe("openHealthConnectManage", () => {
  beforeEach(() => {
    mockOpenSettings.mockReset();
    mockOpenSettings.mockResolvedValue(undefined);
  });

  it("calls openHealthConnectSettings when available (Hevy Manage)", async () => {
    const openHealthConnectSettings = jest.fn();
    const ok = await openHealthConnectManage({ openHealthConnectSettings });
    expect(ok).toBe(true);
    expect(openHealthConnectSettings).toHaveBeenCalledTimes(1);
    expect(mockOpenSettings).not.toHaveBeenCalled();
  });

  it("falls back to OS settings when HC API is missing", async () => {
    const ok = await openHealthConnectManage({});
    expect(ok).toBe(true);
    expect(mockOpenSettings).toHaveBeenCalledTimes(1);
  });
});
