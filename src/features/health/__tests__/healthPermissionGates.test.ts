import {
  canReadHealthHub,
  canWriteHealthHub,
} from "../healthPermissionGates";

describe("healthPermissionGates", () => {
  it("blocks reads when hub is unavailable", () => {
    expect(
      canReadHealthHub({
        status: "unavailable",
        hasRequestedAuthorization: true,
      })
    ).toBe(false);
  });

  it("blocks reads before connect", () => {
    expect(
      canReadHealthHub({
        status: "undetermined",
        hasRequestedAuthorization: false,
      })
    ).toBe(false);
  });

  it("allows reads after connect even if write status is denied", () => {
    expect(
      canReadHealthHub({
        status: "denied",
        hasRequestedAuthorization: true,
      })
    ).toBe(true);
  });

  it("blocks writes when toggle off, denied, unavailable, or before connect", () => {
    expect(
      canWriteHealthHub({
        status: "granted",
        hasRequestedAuthorization: true,
        writeWorkoutsToHub: false,
      })
    ).toBe(false);
    expect(
      canWriteHealthHub({
        status: "denied",
        hasRequestedAuthorization: true,
        writeWorkoutsToHub: true,
      })
    ).toBe(false);
    expect(
      canWriteHealthHub({
        status: "unavailable",
        hasRequestedAuthorization: true,
        writeWorkoutsToHub: true,
      })
    ).toBe(false);
    expect(
      canWriteHealthHub({
        status: "undetermined",
        hasRequestedAuthorization: false,
        writeWorkoutsToHub: true,
      })
    ).toBe(false);
  });

  it("allows writes after connect while status is undetermined or granted", () => {
    expect(
      canWriteHealthHub({
        status: "undetermined",
        hasRequestedAuthorization: true,
        writeWorkoutsToHub: true,
      })
    ).toBe(true);
    expect(
      canWriteHealthHub({
        status: "granted",
        hasRequestedAuthorization: true,
        writeWorkoutsToHub: true,
      })
    ).toBe(true);
  });
});
