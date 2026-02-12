/**
 * Authentication Models
 *
 * Defines types for user authentication, login/register flows,
 * and token management.
 */

import {
  AuthResponseDto as AuthResponse,
  LoginRequestDto,
  RegisterRequestDto,
  GoogleAuthRequestDto,
  AuthTokensDto as AuthTokens,
} from "@entity-data-models/index";
import { UserContext } from "@entity-data-models/index";

export {
  AuthResponse,
  LoginRequestDto,
  RegisterRequestDto,
  GoogleAuthRequestDto,
  AuthTokens,
  UserContext,
};

export interface AuthState {
  user: UserContext | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
