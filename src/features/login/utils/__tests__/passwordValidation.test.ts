import {
  getPasswordRequirementStatus,
  isPasswordFormReady,
  isStrongPassword,
  passwordsMatch,
} from "../passwordValidation";

describe("passwordValidation", () => {
  it("requires length, case, digit and symbol", () => {
    expect(isStrongPassword("Short1!")).toBe(false);
    expect(isStrongPassword("password1!")).toBe(false);
    expect(isStrongPassword("PASSWORD1!")).toBe(false);
    expect(isStrongPassword("Password!")).toBe(false);
    expect(isStrongPassword("Password1")).toBe(false);
    expect(isStrongPassword("Password1!")).toBe(true);
  });

  it("exposes per-rule status", () => {
    const status = getPasswordRequirementStatus("Abcdef1!");
    expect(status.find((item) => item.id === "length")?.met).toBe(true);
    expect(status.find((item) => item.id === "upper")?.met).toBe(true);
    expect(status.find((item) => item.id === "symbol")?.met).toBe(true);
  });

  it("checks match and form readiness", () => {
    expect(passwordsMatch("Password1!", "")).toBe(false);
    expect(passwordsMatch("Password1!", "Password1!")).toBe(true);
    expect(isPasswordFormReady("Password1!", "Password1!")).toBe(true);
    expect(isPasswordFormReady("Password1!", "Password1")).toBe(false);
  });
});
