import { screenHeaderIconName as nutritionHeaderIconName } from "../../../common/components/screenHeaderIcon";

describe("nutritionHeaderIconName", () => {
  it("uses the iOS back chevron", () => {
    expect(nutritionHeaderIconName("back", "ios")).toBe("chevron-back");
  });

  it("uses the Android back arrow", () => {
    expect(nutritionHeaderIconName("back", "android")).toBe("arrow-back");
  });

  it("keeps a close icon for dismiss screens", () => {
    expect(nutritionHeaderIconName("close", "ios")).toBe("close");
    expect(nutritionHeaderIconName("close", "android")).toBe("close");
  });
});
