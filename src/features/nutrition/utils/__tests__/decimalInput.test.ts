import {
  parseDecimalInput,
  sanitizeDecimalInput,
} from "../decimalInput";

describe("sanitizeDecimalInput", () => {
  it("keeps integers", () => {
    expect(sanitizeDecimalInput("12")).toBe("12");
  });

  it("accepts dot decimals", () => {
    expect(sanitizeDecimalInput("12.5")).toBe("12.5");
  });

  it("normalizes comma decimals", () => {
    expect(sanitizeDecimalInput("12,5")).toBe("12.5");
  });

  it("keeps a single decimal separator", () => {
    expect(sanitizeDecimalInput("12.5.3")).toBe("12.53");
  });

  it("allows typing a trailing separator", () => {
    expect(sanitizeDecimalInput("12.")).toBe("12.");
  });

  it("strips non-numeric characters", () => {
    expect(sanitizeDecimalInput("a1b2,3c")).toBe("12.3");
  });
});

describe("parseDecimalInput", () => {
  it("parses comma decimals", () => {
    expect(parseDecimalInput("1,25")).toBe(1.25);
  });

  it("returns NaN for empty", () => {
    expect(Number.isNaN(parseDecimalInput(""))).toBe(true);
  });
});
