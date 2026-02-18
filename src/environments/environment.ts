const LOCAL_IP = "192.168.1.138";
const LOCAL_API_URL = `http://${LOCAL_IP}:3000/api`;
const PROD_API_URL = "https://api-gym-tracker.onrender.com/api";

// Si defines EXPO_PUBLIC_API_URL, tiene prioridad.
// Si no, en dev usa local y en producción usa remoto.
const RESOLVED_API_URL =
  process.env.EXPO_PUBLIC_API_URL || (__DEV__ ? LOCAL_API_URL : PROD_API_URL);

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
