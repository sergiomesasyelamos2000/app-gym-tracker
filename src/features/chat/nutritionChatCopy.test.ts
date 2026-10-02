import { nutritionChatSubtitle } from "./nutritionChatCopy";

describe("nutritionChatSubtitle", () => {
  it("returns undefined for premium (null remaining)", () => {
    expect(nutritionChatSubtitle(null, 5)).toBeUndefined();
  });

  it("returns remaining count when > 0", () => {
    expect(nutritionChatSubtitle(3, 5)).toBe("3 de 5 consultas");
  });

  it("returns limit reached when 0", () => {
    expect(nutritionChatSubtitle(0, 5)).toBe("Límite alcanzado");
  });
});
