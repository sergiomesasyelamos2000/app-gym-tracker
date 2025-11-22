import { ENV } from "../environments/environment";
import { useAuthStore } from "../store/useAuthStore";

const BASE_URL = ENV.API_URL;

/**
 * Get authentication headers
 * @returns Object with Authorization header if user is authenticated
 */
function getAuthHeaders(): Record<string, string> {
  const accessToken = useAuthStore.getState().accessToken;

  if (accessToken) {
    return {
      Authorization: `Bearer ${accessToken}`,
    };
  }

  return {};
}

export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const authHeaders = getAuthHeaders();

  const response = await fetch(`${BASE_URL}/${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
      ...authHeaders, // Inject authentication token
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    // Handle 401 Unauthorized - clear auth state
    if (response.status === 401) {
      const authStore = useAuthStore.getState();
      authStore.clearAuth();
    }

    // ✅ Intentar parsear el error como JSON
    const errorText = await response.text();
    let errorMessage = `Error ${response.status}`;
    let errorDetails: any = null;

    try {
      const errorData = JSON.parse(errorText);
      // Extraer el mensaje del error del backend
      errorMessage = errorData.message || errorData.error || errorText;
      errorDetails = errorData;

      console.error("❌ API Error Response:", {
        status: response.status,
        statusText: response.statusText,
        endpoint,
        errorData,
      });
    } catch {
      // Si no es JSON, usar el texto completo
      errorMessage = errorText || errorMessage;

      console.error("❌ API Error (non-JSON):", {
        status: response.status,
        statusText: response.statusText,
        endpoint,
        errorText,
      });
    }

    const error = new Error(errorMessage);
    (error as any).status = response.status;
    (error as any).statusText = response.statusText;
    (error as any).details = errorDetails;

    throw error;
  }

  // ✅ Si es 204 (sin contenido), no intentes hacer .json()
  if (response.status === 204) {
    return undefined as T;
  }

  // ✅ También si el body está vacío, evitar parsear
  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text);
}
