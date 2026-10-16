import {
  appendHealthSyncToSuccessMessage,
  healthHubLabel,
  isHealthHubConnected,
  planHealthFinishSync,
} from "../healthHubConnection";

describe("isHealthHubConnected", () => {
  it("is false before connect or when unavailable", () => {
    expect(
      isHealthHubConnected({
        status: "undetermined",
        hasRequestedAuthorization: false,
      })
    ).toBe(false);
    expect(
      isHealthHubConnected({
        status: "unavailable",
        hasRequestedAuthorization: true,
      })
    ).toBe(false);
  });

  it("is true after connect even when write status is undetermined or denied", () => {
    expect(
      isHealthHubConnected({
        status: "undetermined",
        hasRequestedAuthorization: true,
      })
    ).toBe(true);
    expect(
      isHealthHubConnected({
        status: "denied",
        hasRequestedAuthorization: true,
      })
    ).toBe(true);
    expect(
      isHealthHubConnected({
        status: "granted",
        hasRequestedAuthorization: true,
      })
    ).toBe(true);
  });
});

describe("planHealthFinishSync", () => {
  it("offers a one-time soft prompt before first connect", () => {
    expect(
      planHealthFinishSync({
        status: "undetermined",
        hasRequestedAuthorization: false,
        writeWorkoutsToHub: true,
        finishPromptDismissed: false,
      })
    ).toEqual({ kind: "offer_prompt" });
  });

  it("skips prompt after dismiss and when hub unavailable", () => {
    expect(
      planHealthFinishSync({
        status: "undetermined",
        hasRequestedAuthorization: false,
        writeWorkoutsToHub: true,
        finishPromptDismissed: true,
      })
    ).toEqual({ kind: "skip" });
    expect(
      planHealthFinishSync({
        status: "unavailable",
        hasRequestedAuthorization: false,
        writeWorkoutsToHub: true,
        finishPromptDismissed: false,
      })
    ).toEqual({ kind: "skip" });
  });

  it("writes when connected with sync on, otherwise skips", () => {
    expect(
      planHealthFinishSync({
        status: "granted",
        hasRequestedAuthorization: true,
        writeWorkoutsToHub: true,
        finishPromptDismissed: false,
      })
    ).toEqual({ kind: "write" });
    expect(
      planHealthFinishSync({
        status: "undetermined",
        hasRequestedAuthorization: true,
        writeWorkoutsToHub: true,
        finishPromptDismissed: false,
      })
    ).toEqual({ kind: "write" });
    expect(
      planHealthFinishSync({
        status: "granted",
        hasRequestedAuthorization: true,
        writeWorkoutsToHub: false,
        finishPromptDismissed: false,
      })
    ).toEqual({ kind: "skip" });
    expect(
      planHealthFinishSync({
        status: "denied",
        hasRequestedAuthorization: true,
        writeWorkoutsToHub: true,
        finishPromptDismissed: false,
      })
    ).toEqual({ kind: "skip" });
  });
});

describe("appendHealthSyncToSuccessMessage", () => {
  it("appends sync success or failure notes", () => {
    expect(
      appendHealthSyncToSuccessMessage("Ok", "synced", "Apple Salud")
    ).toContain("Apple Salud");
    expect(
      appendHealthSyncToSuccessMessage("Ok", "failed", "Apple Salud")
    ).toContain("No se pudo guardar");
    expect(
      appendHealthSyncToSuccessMessage("Ok", "skipped", "Apple Salud")
    ).toBe("Ok");
  });
});

describe("healthHubLabel", () => {
  it("names the platform hub", () => {
    expect(healthHubLabel("ios")).toBe("Apple Salud");
    expect(healthHubLabel("android")).toBe("Health Connect");
  });
});
