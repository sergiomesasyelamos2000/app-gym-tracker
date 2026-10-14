import { ApiError } from "../../../../api/client";
import { lookupScannedBarcode } from "../barcodeLookupFlow";
import { scanBarcode } from "../../services/nutritionService";

jest.mock("../../services/nutritionService", () => ({
  scanBarcode: jest.fn(),
}));

const mockedScan = scanBarcode as jest.MockedFunction<typeof scanBarcode>;

describe("lookupScannedBarcode", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns found on 200 with product code", async () => {
    mockedScan.mockResolvedValue({
      code: "5600380893930",
      name: "Creatine",
    } as any);

    await expect(lookupScannedBarcode("5600380893930")).resolves.toEqual({
      kind: "found",
      product: expect.objectContaining({ code: "5600380893930" }),
    });
  });

  it("maps 400 to invalid_code", async () => {
    mockedScan.mockRejectedValue(new ApiError("bad", 400));
    await expect(
      lookupScannedBarcode("https://prozis.com"),
    ).resolves.toEqual({
      kind: "invalid_code",
      code: "https://prozis.com",
    });
  });

  it("maps 404 to not_found", async () => {
    mockedScan.mockRejectedValue(new ApiError("missing", 404));
    await expect(lookupScannedBarcode("5600380893930")).resolves.toEqual({
      kind: "not_found",
      code: "5600380893930",
    });
  });

  it("maps 503 / network to lookup_failed", async () => {
    mockedScan.mockRejectedValue(new ApiError("down", 503));
    await expect(lookupScannedBarcode("5600380893930")).resolves.toEqual({
      kind: "lookup_failed",
      code: "5600380893930",
    });
  });
});
