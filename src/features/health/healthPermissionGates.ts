import type { HealthAuthorizationStatus } from "./types";

export type HealthGateInput = {
  status: HealthAuthorizationStatus;
  hasRequestedAuthorization: boolean;
};

/**
 * Reads (rest hints, live HR/kcal) after the user has completed Connect.
 * Do not require write `granted` — HealthKit hides read grants, and a denied
 * write must not starve reads.
 */
export function canReadHealthHub(input: HealthGateInput): boolean {
  if (input.status === "unavailable") return false;
  return input.hasRequestedAuthorization;
}

/**
 * Mirror completed workouts into the hub after Connect, when write is not
 * explicitly denied and the hub module is available.
 */
export function canWriteHealthHub(
  input: HealthGateInput & { writeWorkoutsToHub: boolean }
): boolean {
  if (!input.writeWorkoutsToHub) return false;
  if (!input.hasRequestedAuthorization) return false;
  if (input.status === "unavailable") return false;
  if (input.status === "denied") return false;
  return true;
}
