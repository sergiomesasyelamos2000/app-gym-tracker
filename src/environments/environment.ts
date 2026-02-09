const isDev = process.env.NODE_ENV === "development";

// Para desarrollo local:
// - Si usas emulador Android: usa "10.0.2.2:3000"
// - Si usas emulador iOS o dispositivo físico en la misma red: usa tu IP local (ej: "192.168.1.X:3000")
// - Si usas Expo Go en dispositivo físico: usa tu IP local
const LOCAL_IP = "192.168.1.135"; // ⚠️ IMPORTANTE: Para dispositivo físico DEBES usar tu IP WiFi, NO localhost

export const ENV = {
  API_URL: isDev
    ? `http://${LOCAL_IP}:3000/api`
    : "https://your-prod-api.com/api",
};

export const ENV_ASSETS = {
  API_URL: isDev ? `http://${LOCAL_IP}:3000` : "https://your-prod-api.com",
};
