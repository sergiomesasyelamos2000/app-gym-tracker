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

  // 🔍 DEBUG: Log token being sent
  const accessToken = useAuthStore.getState().accessToken;
  console.log("🔍 API Request:", {
    endpoint,
    hasToken: !!accessToken,
    tokenPreview: accessToken ? `${accessToken.substring(0, 20)}...` : "none",
  });

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
    // ✅ Intentar parsear el error como JSON
    const errorText = await response.text();
    let errorMessage = `Error ${response.status}`;
    let errorDetails: any = null;

    try {
      const errorData = JSON.parse(errorText);
      // Extraer el mensaje del error del backend
      errorMessage = errorData.message || errorData.error || errorText;
      errorDetails = errorData;

      console.log("❌ API Error Response:", {
        status: response.status,
        statusText: response.statusText,
        endpoint,
        errorData,
      });
    } catch {
      // Si no es JSON, usar el texto completo
      errorMessage = errorText || errorMessage;

      console.log("❌ API Error (non-JSON):", {
        status: response.status,
        statusText: response.statusText,
        endpoint,
        errorText,
      });
    }
    // ✅ Handle 401 Unauthorized
    if (response.status === 401) {
      const messageLower = errorMessage.toLowerCase();

      // List of endpoints that may return 401 for missing resources (not auth errors)
      const resourceNotFoundEndpoints = [
        "nutrition/user-profile",
        "nutrition/profile",
      ];

      // Check if this is a resource-not-found 401 (e.g., missing nutrition profile)
      const isResourceNotFound = resourceNotFoundEndpoints.some((path) =>
        endpoint.includes(path)
      );

      // If it's not a resource-not-found endpoint, treat it as an auth error
      if (!isResourceNotFound) {
        console.log(
          "🔒 Authentication error detected (401 Unauthorized) - clearing auth state"
        );
        const authStore = useAuthStore.getState();
        authStore.clearAuth();
      } else {
        console.log(
          "⚠️ 401 error but not an auth failure - likely missing resource"
        );
      }
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
