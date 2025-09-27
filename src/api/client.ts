import { ENV } from "../environments/environment";

const BASE_URL = ENV.API_URL;

export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${BASE_URL}/${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error ${response.status}: ${errorText}`);
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
