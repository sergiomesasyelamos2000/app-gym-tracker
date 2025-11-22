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

    try {
      const errorData = JSON.parse(errorText);
      // Extraer el mensaje del error del backend
      errorMessage = errorData.message || errorData.error || errorText;
    } catch {
      // Si no es JSON, usar el texto completo
      errorMessage = errorText || errorMessage;
    }

    throw new Error(errorMessage);
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
