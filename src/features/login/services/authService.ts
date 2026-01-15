/**
 * Authentication Service
 *
 * Handles all authentication-related API calls including login,
 * register, Google OAuth, logout, and token refresh.
 */

import { apiFetch } from "../../../api/client";
import {
  AuthResponse,
  GoogleAuthRequestDto,
  LoginRequestDto,
  RegisterRequestDto,
  User,
} from "../../../models";

/**
 * Login with email and password
 */
export async function login(
  credentials: LoginRequestDto
): Promise<AuthResponse> {
  return await apiFetch<AuthResponse>("auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

/**
 * Register new user with email and password
 */
export async function register(
  userData: RegisterRequestDto
): Promise<AuthResponse> {
  return await apiFetch<AuthResponse>("auth/register", {
    method: "POST",
    body: JSON.stringify(userData),
  });
}

/**
 * Authenticate with Google OAuth
 */
export async function googleAuth(
  googleData: GoogleAuthRequestDto
): Promise<AuthResponse> {
  return await apiFetch<AuthResponse>("auth/google/callback", {
    method: "POST",
    body: JSON.stringify(googleData),
  });
}

/**
 * Logout (invalidate tokens on server)
 */
export async function logout(): Promise<void> {
  try {
    await apiFetch<void>("auth/logout", {
      method: "POST",
    });
  } catch (error) {
    // Even if server logout fails, we clear local state
    console.warn("Logout request failed, clearing local state anyway:", error);
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<AuthResponse> {
  return await apiFetch<AuthResponse>("auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

/**
 * Get current user profile
 */
export async function getCurrentUser(): Promise<User> {
  return await apiFetch<User>("auth/me", {
    method: "GET",
  });
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<User>
): Promise<User> {
  return await apiFetch<User>(`auth/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

/**
 * Verify token validity
 */
export async function verifyToken(): Promise<{ valid: boolean; user?: User }> {
  try {
    const user = await getCurrentUser();
    return { valid: true, user };
  } catch (error) {
    return { valid: false };
  }
}
