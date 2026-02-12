import { ENV } from "../environments/environment";
import { useAuthStore } from "../store/useAuthStore";

const BASE_URL = ENV.API_URL;

// Track if a token refresh is in progress to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

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

/**
 * Refresh the access token using the refresh token
 * Prevents multiple simultaneous refresh attempts using a shared promise
 * @returns New tokens or null if refresh failed
 */
async function attemptTokenRefresh(): Promise<boolean> {
  // If already refreshing, return the existing promise
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  const { refreshToken } = useAuthStore.getState();

  if (!refreshToken) {
    console.error("[TokenRefresh] No refresh token available");
    return false;
  }

  // Set refreshing flag and create new promise
  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      // Call refresh endpoint directly (without using apiFetch to avoid recursion)
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "[TokenRefresh] Failed with status:",
          response.status,
          errorText
        );
        return false;
      }

      const data = await response.json();

      // Update tokens in store
      if (data.tokens) {
        return true;
      }

      console.error("Token refresh response missing tokens field");
      return false;
    } catch (error) {
      console.error("[TokenRefresh] Exception:", error);
      return false;
    } finally {
      // Reset refreshing state
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export class ApiError extends Error {
  status?: number;
  statusText?: string;
  details?: unknown;

  constructor(
    message: string,
    status?: number,
    statusText?: string,
    details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.statusText = statusText;
    this.details = details;
  }
}

export async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
  isRetry: boolean = false
): Promise<T> {
  const authHeaders = getAuthHeaders();
  const tokenPreview = authHeaders.Authorization?.substring(0, 30) + "...";

  if (isRetry) {
    console.log(
      `[ApiClient] Retry request to ${endpoint} with token: ${tokenPreview}`
    );
  }

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
    let errorDetails: unknown = null;

    try {
      const errorData = JSON.parse(errorText);
      // Extraer el mensaje del error del backend
      errorMessage = errorData.message || errorData.error || errorText;
      errorDetails = errorData;
    } catch {
      // Si no es JSON, usar el texto completo
      errorMessage = errorText || errorMessage;
    }

    // ✅ Handle 401 Unauthorized with automatic token refresh
    if (response.status === 401) {
      // List of endpoints that may return 401 for missing resources (not auth errors)
      const resourceNotFoundEndpoints = [
        "nutrition/user-profile",
        "nutrition/profile",
      ];

      // Check if this is a resource-not-found 401 (e.g., missing nutrition profile)
      const isResourceNotFound = resourceNotFoundEndpoints.some((path) =>
        endpoint.includes(path)
      );

      // If it's not a resource-not-found endpoint and we haven't retried yet
      if (!isResourceNotFound && !isRetry) {
        // Attempt to refresh the token
        const refreshSuccess = await attemptTokenRefresh();

        if (refreshSuccess) {
          // Retry the original request with the new token
          return apiFetch<T>(endpoint, options, true);
        } else {
          console.error("[ApiClient] Token refresh failed");
        }
      }

      // If we reach here, either:
      // 1. It's a resource-not-found 401 (don't logout)
      // 2. Token refresh failed (logout)
      // 3. This is already a retry (logout to avoid infinite loop)
      if (!isResourceNotFound) {
        console.warn(
          "[ApiClient] Token refresh failed. Clearing auth. Endpoint:",
          endpoint
        );
        const authStore = useAuthStore.getState();
        authStore.clearAuth();
      }
    }

    throw new ApiError(
      errorMessage,
      response.status,
      response.statusText,
      errorDetails
    );
  }

  // ✅ Si es 204 (sin contenido), no intentes hacer .json()
  if (response.status === 204) {
    return undefined as T;
  }

  // ✅ Check Content-Type to determine how to parse response
  const contentType = response.headers.get("Content-Type") || "";

  // Si es PDF u otro binario, devolver ArrayBuffer
  if (
    contentType.includes("application/pdf") ||
    contentType.includes("application/octet-stream")
  ) {
    const arrayBuffer = await response.arrayBuffer();
    return arrayBuffer as T;
  }

  // ✅ También si el body está vacío, evitar parsear
  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}
