import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const API_URL =
  Constants.expoConfig?.extra?.apiUrl || "http://localhost:3000/api";

type RequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  auth?: boolean; // 👈 indica si necesita token
};

const apiFetch = async (endpoint: string, options: RequestOptions = {}) => {
  const { method = "GET", headers = {}, body, auth = true } = options;

  // Obtener el token desde AsyncStorage (si aplica)
  let token: string | null = null;
  if (auth) {
    token = await AsyncStorage.getItem("access_token");
  }

  // Configurar cabeceras
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };
  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  try {
    console.log(`📡 ${method} ${API_URL}${endpoint}`);

    // Ejecutar la petición
    const response = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    console.log(`📥 Response status: ${response.status}`);

    // Si el token expira (401)
    if (response.status === 401) {
      console.log("⚠️ Token expirado, limpiando storage");
      await AsyncStorage.removeItem("access_token");
      await AsyncStorage.removeItem("user");
      throw new Error("Unauthorized");
    }

    // Parsear respuesta JSON
    const data = await response.json();

    // Manejar errores no 2xx
    if (!response.ok) {
      console.error(`❌ Error ${response.status}:`, data);
      throw new Error(data.message || `Error ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error("❌ API error:", error);
    throw error;
  }
};

// 🎯 Helper methods para facilitar el uso (estilo axios)
const api = {
  get: (endpoint: string, options?: Omit<RequestOptions, "method" | "body">) =>
    apiFetch(endpoint, { ...options, method: "GET" }),

  post: (
    endpoint: string,
    body?: any,
    options?: Omit<RequestOptions, "method" | "body">
  ) => apiFetch(endpoint, { ...options, method: "POST", body }),

  put: (
    endpoint: string,
    body?: any,
    options?: Omit<RequestOptions, "method" | "body">
  ) => apiFetch(endpoint, { ...options, method: "PUT", body }),

  patch: (
    endpoint: string,
    body?: any,
    options?: Omit<RequestOptions, "method" | "body">
  ) => apiFetch(endpoint, { ...options, method: "PATCH", body }),

  delete: (
    endpoint: string,
    options?: Omit<RequestOptions, "method" | "body">
  ) => apiFetch(endpoint, { ...options, method: "DELETE" }),
};

// También exportar la función base por si se necesita
export { apiFetch };
export default api;
