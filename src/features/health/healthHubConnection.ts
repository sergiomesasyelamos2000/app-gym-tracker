import type { HealthAuthorizationStatus } from "./types";

export type HealthHubConnectionInput = {
  status: HealthAuthorizationStatus;
  hasRequestedAuthorization: boolean;
};

/**
 * User has completed Connect and the hub module is usable.
 * HealthKit often leaves write status `undetermined`; treat that as connected.
 */
export function isHealthHubConnected(input: HealthHubConnectionInput): boolean {
  if (!input.hasRequestedAuthorization) return false;
  if (input.status === "unavailable") return false;
  return true;
}

export type HealthFinishPlan =
  | { kind: "offer_prompt" }
  | { kind: "write" }
  | { kind: "skip" };

export function planHealthFinishSync(input: {
  status: HealthAuthorizationStatus;
  hasRequestedAuthorization: boolean;
  writeWorkoutsToHub: boolean;
  finishPromptDismissed: boolean;
}): HealthFinishPlan {
  if (input.status === "unavailable") return { kind: "skip" };

  if (!input.hasRequestedAuthorization) {
    if (input.finishPromptDismissed) return { kind: "skip" };
    return { kind: "offer_prompt" };
  }

  if (!input.writeWorkoutsToHub) return { kind: "skip" };
  if (input.status === "denied") return { kind: "skip" };
  return { kind: "write" };
}

export type HealthWriteOutcome = "synced" | "failed" | "skipped";

export function appendHealthSyncToSuccessMessage(
  baseMessage: string,
  outcome: HealthWriteOutcome,
  hubLabel: string
): string {
  if (outcome === "synced") {
    return `${baseMessage}\n\nTambién se guardó en ${hubLabel}.`;
  }
  if (outcome === "failed") {
    return `${baseMessage}\n\nNo se pudo guardar en ${hubLabel}. Revisa permisos en Ajustes.`;
  }
  return baseMessage;
}

export function healthHubLabel(platform: string): string {
  return platform === "ios" ? "Apple Salud" : "Health Connect";
}
