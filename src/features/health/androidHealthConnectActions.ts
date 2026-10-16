import { Linking, Platform } from "react-native";

/** Play Store package for the Health Connect provider app. */
export const HEALTH_CONNECT_PACKAGE = "com.google.android.apps.healthdata";

export const HEALTH_CONNECT_PLAY_STORE_MARKET_URL = `market://details?id=${HEALTH_CONNECT_PACKAGE}`;
export const HEALTH_CONNECT_PLAY_STORE_WEB_URL = `https://play.google.com/store/apps/details?id=${HEALTH_CONNECT_PACKAGE}`;

export type HealthConnectProviderAvailability =
  | "available"
  | "update_required"
  | "unavailable";

/**
 * Map react-native-health-connect getSdkStatus codes to a UI-friendly kind.
 * 1 = SDK_UNAVAILABLE, 2 = SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED, 3 = SDK_AVAILABLE
 */
export function classifyHealthConnectSdkStatus(
  status: number,
  constants?: {
    SDK_UNAVAILABLE?: number;
    SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED?: number;
    SDK_AVAILABLE?: number;
  }
): HealthConnectProviderAvailability {
  const unavailable = constants?.SDK_UNAVAILABLE ?? 1;
  const updateRequired =
    constants?.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED ?? 2;
  const available = constants?.SDK_AVAILABLE ?? 3;

  if (status === available) return "available";
  if (status === updateRequired) return "update_required";
  if (status === unavailable) return "unavailable";
  return "unavailable";
}

export async function openHealthConnectPlayStore(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  try {
    const canMarket = await Linking.canOpenURL(
      HEALTH_CONNECT_PLAY_STORE_MARKET_URL
    );
    await Linking.openURL(
      canMarket
        ? HEALTH_CONNECT_PLAY_STORE_MARKET_URL
        : HEALTH_CONNECT_PLAY_STORE_WEB_URL
    );
    return true;
  } catch {
    try {
      await Linking.openURL(HEALTH_CONNECT_PLAY_STORE_WEB_URL);
      return true;
    } catch {
      return false;
    }
  }
}

type HealthConnectModule = {
  getSdkStatus?: (providerPackageName?: string) => Promise<number>;
  openHealthConnectSettings?: () => void;
  SdkAvailabilityStatus?: {
    SDK_UNAVAILABLE?: number;
    SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED?: number;
    SDK_AVAILABLE?: number;
  };
};

export function loadHealthConnectModule(): HealthConnectModule | null {
  if (Platform.OS !== "android") return null;
  try {
    return require("react-native-health-connect") as HealthConnectModule;
  } catch {
    return null;
  }
}

export async function probeHealthConnectAvailability(
  mod: HealthConnectModule | null = loadHealthConnectModule()
): Promise<HealthConnectProviderAvailability> {
  if (!mod?.getSdkStatus) return "unavailable";
  try {
    const status = await mod.getSdkStatus();
    return classifyHealthConnectSdkStatus(status, mod.SdkAvailabilityStatus);
  } catch {
    return "unavailable";
  }
}

/**
 * Opens Health Connect app permissions / settings (Hevy "Manage" behavior).
 * Falls back to OS app settings if the HC API is missing.
 */
export async function openHealthConnectManage(
  mod: HealthConnectModule | null = loadHealthConnectModule()
): Promise<boolean> {
  if (Platform.OS !== "android") {
    try {
      await Linking.openSettings();
      return true;
    } catch {
      return false;
    }
  }

  try {
    if (typeof mod?.openHealthConnectSettings === "function") {
      mod.openHealthConnectSettings();
      return true;
    }
  } catch {
    // fall through
  }

  try {
    await Linking.openSettings();
    return true;
  } catch {
    return false;
  }
}
