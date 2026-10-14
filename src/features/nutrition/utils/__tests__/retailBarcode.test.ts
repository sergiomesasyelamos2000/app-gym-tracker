import {
  confirmRetailBarcodeRead,
  normalizeRetailBarcode,
} from "../retailBarcode";

describe("normalizeRetailBarcode", () => {
  it("accepts valid Prozis EAN-13", () => {
    expect(normalizeRetailBarcode("5600380893930")).toEqual({
      ok: true,
      canonical: "5600380893930",
    });
  });

  it("rejects URL QR payloads", () => {
    expect(normalizeRetailBarcode("https://prozis.com/p/123")).toEqual({
      ok: false,
      reason: "url",
    });
  });

  it("rejects non-digit text", () => {
    expect(normalizeRetailBarcode("Prozis Whey").ok).toBe(false);
  });

  it("rejects bad checksum", () => {
    expect(normalizeRetailBarcode("5600380893931")).toEqual({
      ok: false,
      reason: "bad_checksum",
    });
  });
});

describe("confirmRetailBarcodeRead", () => {
  it("does not accept a single read", () => {
    const first = confirmRetailBarcodeRead(
      { candidate: null, firstSeenAt: null },
      "5600380893930",
      1000,
    );
    expect(first.accepted).toBe(false);
    expect(first.next.candidate).toBe("5600380893930");
  });

  it("accepts the second identical read within the window", () => {
    const first = confirmRetailBarcodeRead(
      { candidate: null, firstSeenAt: null },
      "5600380893930",
      1000,
    );
    const second = confirmRetailBarcodeRead(
      first.next,
      "5600380893930",
      1200,
    );
    expect(second.accepted).toBe(true);
  });
});
