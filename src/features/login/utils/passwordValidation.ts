export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

export type PasswordRequirementId =
  | "length"
  | "upper"
  | "lower"
  | "digit"
  | "symbol";

export type PasswordRequirementStatus = {
  id: PasswordRequirementId;
  label: string;
  met: boolean;
};

export const PASSWORD_REQUIREMENT_LABELS: Record<
  PasswordRequirementId,
  string
> = {
  length: `${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} caracteres`,
  upper: "Una mayúscula",
  lower: "Una minúscula",
  digit: "Un número",
  symbol: "Un símbolo",
};

export const getPasswordRequirementStatus = (
  password: string
): PasswordRequirementStatus[] => [
  {
    id: "length",
    label: PASSWORD_REQUIREMENT_LABELS.length,
    met:
      password.length >= PASSWORD_MIN_LENGTH &&
      password.length <= PASSWORD_MAX_LENGTH,
  },
  {
    id: "upper",
    label: PASSWORD_REQUIREMENT_LABELS.upper,
    met: /[A-Z]/.test(password),
  },
  {
    id: "lower",
    label: PASSWORD_REQUIREMENT_LABELS.lower,
    met: /[a-z]/.test(password),
  },
  {
    id: "digit",
    label: PASSWORD_REQUIREMENT_LABELS.digit,
    met: /\d/.test(password),
  },
  {
    id: "symbol",
    label: PASSWORD_REQUIREMENT_LABELS.symbol,
    met: /[^A-Za-z0-9]/.test(password),
  },
];

export const isStrongPassword = (password: string): boolean =>
  getPasswordRequirementStatus(password).every((item) => item.met);

export const passwordsMatch = (
  password: string,
  confirmPassword: string
): boolean =>
  password.length > 0 &&
  confirmPassword.length > 0 &&
  password === confirmPassword;

/** Password is strong and confirmation matches — gates create/reset CTAs. */
export const isPasswordFormReady = (
  password: string,
  confirmPassword: string
): boolean => isStrongPassword(password) && passwordsMatch(password, confirmPassword);
