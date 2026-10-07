import { shouldBlockHomeTabPress } from "../homeTabGate";

describe("shouldBlockHomeTabPress", () => {
  it("never blocks Inicio", () => {
    expect(shouldBlockHomeTabPress("Inicio", false)).toBe(false);
    expect(shouldBlockHomeTabPress("Inicio", true)).toBe(false);
  });

  it.each(["Entreno", "Nutrición", "Macros", "Perfil"] as const)(
    "blocks %s only when home is not ready",
    (routeName) => {
      expect(shouldBlockHomeTabPress(routeName, false)).toBe(true);
      expect(shouldBlockHomeTabPress(routeName, true)).toBe(false);
    }
  );
});
