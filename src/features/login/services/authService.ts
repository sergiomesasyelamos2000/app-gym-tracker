/**
 * Authentication Service
 *
 * Handles all authentication-related API calls including login,
 * register, Google OAuth, logout, and token refresh.
 */

import {
  ForgotPasswordRequestDto,
  ForgotPasswordResponseDto,
  ResetPasswordRequestDto,
  UpdateUserProfileDto,
  UserResponseDto,
} from "@entity-data-models/auth.dto";
import { apiFetch } from "../../../api/client";
import {
  AuthResponse,
  GoogleAuthRequestDto,
  LoginRequestDto,
  RegisterRequestDto,
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
 * Request password reset token
 */
export async function forgotPassword(
  payload: ForgotPasswordRequestDto
): Promise<ForgotPasswordResponseDto> {
  return await apiFetch<ForgotPasswordResponseDto>("auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Reset password with token
 */
export async function resetPassword(
  payload: ResetPasswordRequestDto
): Promise<{ message: string }> {
  return await apiFetch<{ message: string }>("auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Get current user profile
 */
export async function getCurrentUser(): Promise<UserResponseDto> {
  return await apiFetch<UserResponseDto>("auth/me", {
    method: "GET",
  });
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<UpdateUserProfileDto>
): Promise<UserResponseDto> {
  return await apiFetch<UserResponseDto>(`auth/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

/**
 * Verify token validity
 */
export async function verifyToken(): Promise<{
  valid: boolean;
  user?: UserResponseDto;
}> {
  try {
    const user = await getCurrentUser();
    return { valid: true, user };
  } catch (error) {
    return { valid: false };
  }
}
