import { Platform } from "react-native";

const LOCAL_IP = "192.168.1.133";
const LOCAL_API_URL = `http://${LOCAL_IP}:3000/api`;
const LOCAL_ANDROID_EMULATOR_API_URL = "http://10.0.2.2:3000/api";
const LOCAL_ANDROID_DEVICE_API_URL = LOCAL_API_URL;
const PROD_API_URL = "https://api-gym-tracker.onrender.com/api";

const androidConstants = Platform.OS === "android" ? Platform.constants : null;
const androidFingerprint = String(
  (androidConstants as { Fingerprint?: string } | null)?.Fingerprint || ""
).toLowerCase();
const androidModel = String(
  (androidConstants as { Model?: string } | null)?.Model || ""
).toLowerCase();
const androidBrand = String(
  (androidConstants as { Brand?: string } | null)?.Brand || ""
).toLowerCase();

const isAndroidEmulator =
  Platform.OS === "android" &&
  (androidFingerprint.includes("generic") ||
    androidFingerprint.includes("emulator") ||
    androidModel.includes("sdk") ||
    androidModel.includes("emulator") ||
    androidBrand.includes("generic"));

const DEFAULT_ANDROID_API_URL = isAndroidEmulator
  ? LOCAL_ANDROID_EMULATOR_API_URL
  : LOCAL_ANDROID_DEVICE_API_URL;

// Si defines EXPO_PUBLIC_API_URL, tiene prioridad.
// Si no, en dev usa URL por plataforma y en producción usa remoto.
// Android Emulator usa 10.0.2.2 para acceder al host.
const RESOLVED_API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (__DEV__
    ? Platform.OS === "android"
      ? process.env.EXPO_PUBLIC_API_URL_ANDROID ||
        DEFAULT_ANDROID_API_URL
      : process.env.EXPO_PUBLIC_API_URL_IOS || LOCAL_API_URL
    : PROD_API_URL);

const getAssetBaseUrl = (apiUrl: string) => apiUrl.replace(/\/api\/?$/, "");

export const ENV = {
  API_URL: RESOLVED_API_URL,
  GOOGLE_CLIENT_ID_IOS: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || "",
  GOOGLE_CLIENT_ID_ANDROID:
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID || "",
  GOOGLE_CLIENT_ID_WEB: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB || "",
};

export const ENV_ASSETS = {
  API_URL: getAssetBaseUrl(RESOLVED_API_URL),
};
