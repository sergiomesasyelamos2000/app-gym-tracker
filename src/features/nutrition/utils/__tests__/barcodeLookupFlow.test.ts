import { ApiError } from "../../../../api/client";
import { findProductInLocalCaches } from "../../../../services/offlineNutritionService";
import { isOnline } from "../../../../services/syncQueue";
import { lookupScannedBarcode } from "../barcodeLookupFlow";
import { scanBarcode } from "../../services/nutritionService";

jest.mock("../../services/nutritionService", () => ({
  scanBarcode: jest.fn(),
}));

jest.mock("../../../../services/syncQueue", () => ({
  isOnline: jest.fn(async () => true),
}));

jest.mock("../../../../services/offlineNutritionService", () => ({
  findProductInLocalCaches: jest.fn(async () => null),
}));

const mockedScan = scanBarcode as jest.MockedFunction<typeof scanBarcode>;
const mockedIsOnline = isOnline as jest.MockedFunction<typeof isOnline>;
const mockedLocal = findProductInLocalCaches as jest.MockedFunction<
  typeof findProductInLocalCaches
>;

describe("lookupScannedBarcode", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedIsOnline.mockResolvedValue(true);
    mockedLocal.mockResolvedValue(null);
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

  it("maps 503 / network to lookup_failed when local miss", async () => {
    mockedScan.mockRejectedValue(new ApiError("down", 503));
    await expect(lookupScannedBarcode("5600380893930")).resolves.toEqual({
      kind: "lookup_failed",
      code: "5600380893930",
    });
  });

  it("offline uses local cache only and fails when missing", async () => {
    mockedIsOnline.mockResolvedValue(false);
    mockedLocal.mockResolvedValue(null);

    await expect(lookupScannedBarcode("5600380893930")).resolves.toEqual({
      kind: "not_found",
      code: "5600380893930",
    });
    expect(mockedScan).not.toHaveBeenCalled();
  });

  it("offline returns local hit without network", async () => {
    mockedIsOnline.mockResolvedValue(false);
    mockedLocal.mockResolvedValue({
      code: "5600380893930",
      name: "Cached",
    } as any);

    await expect(lookupScannedBarcode("5600380893930")).resolves.toEqual({
      kind: "found",
      product: expect.objectContaining({ code: "5600380893930" }),
    });
    expect(mockedScan).not.toHaveBeenCalled();
  });
});
