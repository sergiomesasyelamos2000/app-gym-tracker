/**
 * Authentication Models
 *
 * Defines types for user authentication, login/register flows,
 * and token management.
 */

import {
  AuthResponse,
  LoginRequestDto,
  RegisterRequestDto,
  GoogleAuthRequestDto,
  AuthTokens,
} from "@entity-data-models/index";
import { UserEntity as User } from "@entity-data-models/index";

export {
  AuthResponse,
  LoginRequestDto,
  RegisterRequestDto,
  GoogleAuthRequestDto,
  AuthTokens,
  User,
};

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
