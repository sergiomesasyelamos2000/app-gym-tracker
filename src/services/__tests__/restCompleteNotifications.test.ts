import {
  isRestCompleteData,
  presentedRestCompleteIds,
  REST_COMPLETE_TYPE,
  scheduledRestCompleteIds,
} from "../restCompleteNotifications";

describe("restCompleteNotifications", () => {
  it("recognizes rest-complete data only", () => {
    expect(isRestCompleteData({ type: REST_COMPLETE_TYPE })).toBe(true);
    expect(isRestCompleteData({ type: "reminder" })).toBe(false);
    expect(isRestCompleteData(null)).toBe(false);
    expect(isRestCompleteData(undefined)).toBe(false);
  });

  it("collects scheduled rest-complete ids and skips reminders", () => {
    expect(
      scheduledRestCompleteIds([
        {
          identifier: "rest-1",
          content: { data: { type: "rest-complete" } },
        },
        {
          identifier: "reminder-1",
          content: { data: { type: "reminder" } },
        },
        {
          identifier: "rest-2",
          content: { data: { type: "rest-complete" } },
        },
        {
          identifier: "rest-1",
          content: { data: { type: "rest-complete" } },
        },
      ])
    ).toEqual(["rest-1", "rest-2"]);
  });

  it("returns empty for missing scheduled list", () => {
    expect(scheduledRestCompleteIds(undefined)).toEqual([]);
    expect(scheduledRestCompleteIds([])).toEqual([]);
  });

  it("collects presented rest-complete ids from nested request shape", () => {
    expect(
      presentedRestCompleteIds([
        {
          request: {
            identifier: "rest-tray",
            content: { data: { type: "rest-complete" } },
          },
        },
        {
          request: {
            identifier: "other",
            content: { data: { type: "reminder" } },
          },
        },
        {
          request: {
            identifier: "rest-tray",
            content: { data: { type: "rest-complete" } },
          },
        },
      ])
    ).toEqual(["rest-tray"]);
  });

  it("returns empty for missing presented list", () => {
    expect(presentedRestCompleteIds(undefined)).toEqual([]);
    expect(presentedRestCompleteIds([{}])).toEqual([]);
  });
});
