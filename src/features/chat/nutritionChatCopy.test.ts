import {
  NUTRITION_AGENT_NAME,
  NUTRITION_CHAT_TITLE,
  NUTRITION_CHAT_WELCOME,
  nutritionChatQuotaBadge,
  nutritionChatRoleLine,
} from "./nutritionChatCopy";

describe("nutrition chat agent copy", () => {
  it("names the agent Ava", () => {
    expect(NUTRITION_AGENT_NAME).toBe("Ava");
    expect(NUTRITION_CHAT_TITLE).toBe("Ava");
    expect(NUTRITION_CHAT_WELCOME).toContain("Ava");
  });

  it("uses a calm role line for premium / unlimited", () => {
    expect(nutritionChatRoleLine()).toBe("Asistente de nutrición");
  });
});

describe("nutritionChatQuotaBadge", () => {
  it("returns null for premium (null remaining)", () => {
    expect(nutritionChatQuotaBadge(null, 10)).toBeNull();
  });

  it("shows remaining free queries in ok tone", () => {
    expect(nutritionChatQuotaBadge(9, 10)).toEqual({
      label: "9 consultas gratis",
      tone: "ok",
    });
  });

  it("warns when remaining is low", () => {
    expect(nutritionChatQuotaBadge(3, 10)).toEqual({
      label: "3 consultas gratis",
      tone: "low",
    });
    expect(nutritionChatQuotaBadge(1, 10)).toEqual({
      label: "1 consulta gratis",
      tone: "low",
    });
  });

  it("makes exhaustion explicit", () => {
    expect(nutritionChatQuotaBadge(0, 10)).toEqual({
      label: "Sin consultas gratis",
      tone: "exhausted",
    });
  });
});
