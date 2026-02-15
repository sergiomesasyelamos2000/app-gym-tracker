/**
 * Authentication Service
 *
 * Handles all authentication-related API calls including login,
 * register, Google OAuth, logout, and token refresh.
 */

import {
  AuthResponseDto,
  ForgotPasswordRequestDto,
  ForgotPasswordResponseDto,
  GoogleAuthRequestDto,
  GoogleLoginRequestDto,
  LoginRequestDto,
  LogoutResponseDto,
  RefreshTokenRequestDto,
  RegisterRequestDto,
  ResetPasswordRequestDto,
  ResetPasswordResponseDto,
  UpdateUserProfileDto,
  UserResponseDto,
} from "@sergiomesasyelamos2000/shared";
import { apiFetch } from "../../../api/client";

/**
 * Login with email and password
 */
export async function login(
  credentials: LoginRequestDto
): Promise<AuthResponseDto> {
  return await apiFetch<AuthResponseDto>("auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

/**
 * Register new user with email and password
 */
export async function register(
  userData: RegisterRequestDto
): Promise<AuthResponseDto> {
  return await apiFetch<AuthResponseDto>("auth/register", {
    method: "POST",
    body: JSON.stringify(userData),
  });
}

/**
 * Authenticate with Google OAuth
 */
export async function googleAuth(
  googleData: GoogleAuthRequestDto
): Promise<AuthResponseDto> {
  return await apiFetch<AuthResponseDto>("auth/google/callback", {
    method: "POST",
    body: JSON.stringify(googleData),
  });
}

/**
 * Authenticate with Google ID token (recommended for mobile)
 */
export async function googleLogin(
  idToken: string
): Promise<AuthResponseDto> {
  const payload: GoogleLoginRequestDto = { idToken };
  return await apiFetch<AuthResponseDto>("auth/google/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Logout (invalidate tokens on server)
 */
export async function logout(): Promise<LogoutResponseDto> {
  try {
    return await apiFetch<LogoutResponseDto>("auth/logout", {
      method: "POST",
    });
  } catch (error) {
    // Even if server logout fails, we clear local state
    console.warn("Logout request failed, clearing local state anyway:", error);
    return { message: "Logout local fallback" };
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<AuthResponseDto> {
  const payload: RefreshTokenRequestDto = { refreshToken };
  return await apiFetch<AuthResponseDto>("auth/refresh", {
    method: "POST",
    body: JSON.stringify(payload),
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
): Promise<ResetPasswordResponseDto> {
  return await apiFetch<ResetPasswordResponseDto>("auth/reset-password", {
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
