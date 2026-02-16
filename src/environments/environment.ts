const isDev = process.env.NODE_ENV === "development";

// Para desarrollo local:
// - Si usas emulador Android: usa "10.0.2.2:3000"
// - Si usas emulador iOS o dispositivo físico en la misma red: usa tu IP local (ej: "192.168.1.X:3000")
// - Si usas Expo Go en dispositivo físico: usa tu IP local
const LOCAL_IP = "192.168.1.136"; // ⚠️ IMPORTANTE: Para dispositivo físico DEBES usar tu IP WiFi, NO localhost
const API_URL_FROM_ENV = process.env.EXPO_PUBLIC_API_URL;
const LOCAL_API_URL = `http://${LOCAL_IP}:3000/api`;
const FALLBACK_PROD_API_URL = "https://api-gym-tracker.onrender.com/api";
const RESOLVED_API_URL =
  API_URL_FROM_ENV ||
  (isDev ? LOCAL_API_URL : FALLBACK_PROD_API_URL);

const getAssetBaseUrl = (apiUrl: string) => apiUrl.replace(/\/api\/?$/, "");

export const ENV = {
  API_URL: RESOLVED_API_URL,
  GOOGLE_CLIENT_ID_IOS: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || "",
  GOOGLE_CLIENT_ID_WEB: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB || "",
  STRIPE_PUBLIC_KEY:
    "pk_test_51SzZYIFd2itPBFXK8rC7AfyOFA9n3oa9aVD0ZyzOZ20JXnXjm02TCqVbW5ENXHeXNIsivaXMbNVlzJdwrVkk7QBZ00bEjByCbE",
};

export const ENV_ASSETS = {
  API_URL: getAssetBaseUrl(RESOLVED_API_URL),
};
