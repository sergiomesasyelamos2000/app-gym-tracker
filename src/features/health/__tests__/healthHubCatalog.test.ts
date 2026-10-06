import {
  HEALTH_ECOSYSTEMS,
  getMvpHubForPlatform,
  getWatchNotesForPlatform,
} from "../healthHubCatalog";

describe("healthHubCatalog", () => {
  it("marks only Apple Salud / Health Connect as MVP hubs via platform", () => {
    expect(getMvpHubForPlatform("ios")).toBe("apple_health");
    expect(getMvpHubForPlatform("android")).toBe("health_connect");
  });

  it("has exactly one apple_watch MVP ecosystem on apple_health", () => {
    const mvp = HEALTH_ECOSYSTEMS.filter((item) => item.status === "mvp");
    expect(mvp).toHaveLength(1);
    expect(mvp[0]?.id).toBe("apple_watch");
    expect(mvp[0]?.hub).toBe("apple_health");
  });

  it("marks every later brand as reachable via hub without OAuth", () => {
    const later = HEALTH_ECOSYSTEMS.filter((item) => item.status === "later");
    expect(later.length).toBeGreaterThan(0);
    for (const item of later) {
      expect(item.reachesUserViaHub).toBe(true);
    }
  });

  it("never implies Bluetooth pairing in watch notes", () => {
    for (const platform of ["ios", "android"] as const) {
      const notes = getWatchNotesForPlatform(platform).join(" ").toLowerCase();
      expect(notes).not.toMatch(/bluetooth/);
      expect(notes).not.toMatch(/emparejar/);
    }
  });
});
