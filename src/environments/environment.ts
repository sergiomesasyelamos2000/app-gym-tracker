import { Platform } from "react-native";

const LOCAL_IP = "192.168.1.133";
const LOCAL_API_URL = `http://${LOCAL_IP}:3000/api`;
const LOCAL_ANDROID_EMULATOR_API_URL = "http://10.0.2.2:3000/api";
const PROD_API_URL = "https://api-gym-tracker.onrender.com/api";

// Si defines EXPO_PUBLIC_API_URL, tiene prioridad.
// Si no, en dev usa URL por plataforma y en producción usa remoto.
// Android Emulator usa 10.0.2.2 para acceder al host.
const RESOLVED_API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (__DEV__
    ? Platform.OS === "android"
      ? process.env.EXPO_PUBLIC_API_URL_ANDROID ||
        LOCAL_ANDROID_EMULATOR_API_URL
      : process.env.EXPO_PUBLIC_API_URL_IOS || LOCAL_API_URL
    : PROD_API_URL);

const getAssetBaseUrl = (apiUrl: string) => apiUrl.replace(/\/api\/?$/, "");

export const ENV = {
  API_URL: RESOLVED_API_URL,
  GOOGLE_CLIENT_ID_IOS: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || "",
  GOOGLE_CLIENT_ID_ANDROID:
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID || "",
  GOOGLE_CLIENT_ID_WEB: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB || "",
  STRIPE_PUBLIC_KEY:
    "pk_test_51SzZYIFd2itPBFXK8rC7AfyOFA9n3oa9aVD0ZyzOZ20JXnXjm02TCqVbW5ENXHeXNIsivaXMbNVlzJdwrVkk7QBZ00bEjByCbE",
};

export const ENV_ASSETS = {
  API_URL: getAssetBaseUrl(RESOLVED_API_URL),
};
