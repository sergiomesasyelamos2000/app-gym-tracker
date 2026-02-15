export type {
  AuthResponseDto as AuthResponse,
  LoginRequestDto,
  RegisterRequestDto,
  GoogleAuthRequestDto,
  AuthTokensDto as AuthTokens,
  UserContext,
} from "@sergiomesasyelamos2000/shared";
import type { UserContext } from "@sergiomesasyelamos2000/shared";

export interface AuthState {
  user: UserContext | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
