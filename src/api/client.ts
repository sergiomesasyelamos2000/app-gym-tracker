import { ENV } from "../environments/environment";
import { Alert } from "react-native";
import { useAuthStore } from "../store/useAuthStore";

const BASE_URL = ENV.API_URL;

// Track if a token refresh is in progress to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;
let isHandlingAuthFailure = false;
let hasShownSessionExpiredAlert = false;

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

function hasContentTypeHeader(headers: HeadersInit | undefined): boolean {
  if (!headers) return false;

  if (headers instanceof Headers) {
    return headers.has("Content-Type") || headers.has("content-type");
  }

  if (Array.isArray(headers)) {
    return headers.some(([key]) => key.toLowerCase() === "content-type");
  }

  return Object.keys(headers).some(
    (key) => key.toLowerCase() === "content-type"
  );
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
        // Refresh failed (expired/revoked refresh token or invalid session)
        return false;
      }

      const data = await response.json();

      // Update tokens in store
      if (data.tokens) {
        useAuthStore.getState().updateTokens(data.tokens);
        return true;
      }

      return false;
    } catch (error) {
      return false;
    } finally {
      // Reset refreshing state
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function notifySessionExpiredOnce() {
  if (hasShownSessionExpiredAlert) return;

  hasShownSessionExpiredAlert = true;
  Alert.alert(
    "Sesión expirada",
    "Tu sesión ha caducado. Inicia sesión de nuevo para continuar."
  );

  setTimeout(() => {
    hasShownSessionExpiredAlert = false;
  }, 5000);
}

function handleAuthFailure(endpoint: string) {
  if (isHandlingAuthFailure) return;
  isHandlingAuthFailure = true;

  try {
    const authStore = useAuthStore.getState();
    authStore.clearAuth();
    notifySessionExpiredOnce();
  } finally {
    // Small delay to debounce multiple 401 responses in parallel
    setTimeout(() => {
      isHandlingAuthFailure = false;
    }, 300);
  }
}

function messageFromErrorBody(status: number, errorText: string): string {
  const trimmed = errorText.trim();
  const isHtml =
    /^<!doctype html/i.test(trimmed) || /^<html[\s>]/i.test(trimmed);
  const isSuspended = /service has been suspended/i.test(trimmed);

  if (isSuspended) {
    return "El servidor está suspendido. Actívalo de nuevo e inténtalo otra vez.";
  }

  if (isHtml) {
    return "El servidor no está disponible. Inténtalo de nuevo en unos minutos.";
  }

  if (!trimmed || trimmed.length > 280) {
    return `Error ${status}`;
  }

  return trimmed;
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
  const authStore = useAuthStore.getState();
  const hadAccessToken = !!authStore.accessToken;
  const authHeaders = getAuthHeaders();
  const tokenPreview = authHeaders.Authorization?.substring(0, 30) + "...";

  if (isRetry) {
    console.log(
      `[ApiClient] Retry request to ${endpoint} with token: ${tokenPreview}`
    );
  }

  const isFormDataBody =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  const customHeaders = options.headers;
  const shouldSetJsonContentType =
    !isFormDataBody && !hasContentTypeHeader(customHeaders);
  const baseHeaders: Record<string, string> = {
    "ngrok-skip-browser-warning": "true",
    ...authHeaders,
  };

  if (shouldSetJsonContentType) {
    baseHeaders["Content-Type"] = "application/json";
  }

  const response = await fetch(`${BASE_URL}/${endpoint}`, {
    headers: {
      ...baseHeaders,
      ...(customHeaders || {}),
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
      const rawMessage = errorData.message || errorData.error || errorText;
      errorMessage =
        typeof rawMessage === "string"
          ? messageFromErrorBody(response.status, rawMessage)
          : `Error ${response.status}`;
      errorDetails = errorData;
    } catch {
      errorMessage = messageFromErrorBody(response.status, errorText);
    }

    // ✅ Handle 401 Unauthorized with automatic token refresh
    if (response.status === 401) {
      // Public auth endpoints should never trigger token refresh logic
      const publicAuthEndpoints = [
        "auth/login",
        "auth/register",
        "auth/google/login",
        "auth/apple/login",
        "auth/google/callback",
        "auth/forgot-password",
        "auth/reset-password",
        "auth/refresh",
      ];

      const isPublicAuthEndpoint = publicAuthEndpoints.some(
        (path) => endpoint === path || endpoint.startsWith(`${path}?`)
      );

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
      if (!isPublicAuthEndpoint && !isResourceNotFound && !isRetry) {
        // Attempt to refresh the token
        const refreshSuccess = await attemptTokenRefresh();

        if (refreshSuccess) {
          // Retry the original request with the new token
          return apiFetch<T>(endpoint, options, true);
        }
      }

      // If we reach here, either:
      // 1. It's a resource-not-found 401 (don't logout)
      // 2. Token refresh failed (logout)
      // 3. This is already a retry (logout to avoid infinite loop)
      if (!isPublicAuthEndpoint && !isResourceNotFound && hadAccessToken) {
        handleAuthFailure(endpoint);
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
