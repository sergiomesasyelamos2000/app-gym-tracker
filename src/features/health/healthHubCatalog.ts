export type HealthHubId = "apple_health" | "health_connect";

export type HealthEcosystemStatus = "mvp" | "later";

export type HealthEcosystemId =
  | "apple_watch"
  | "fitbit_pixel"
  | "galaxy_watch"
  | "garmin"
  | "polar"
  | "amazfit";

export type HealthEcosystem = {
  id: HealthEcosystemId;
  hub: HealthHubId;
  status: HealthEcosystemStatus;
  /** True when the brand can reach EvoFit without a brand OAuth button. */
  reachesUserViaHub: boolean;
  label: string;
  note: string;
};

/**
 * Brand ecosystems users may use. MVP only authorizes the system hub;
 * brand cloud APIs stay `later`.
 */
export const HEALTH_ECOSYSTEMS: readonly HealthEcosystem[] = [
  {
    id: "apple_watch",
    hub: "apple_health",
    status: "mvp",
    reachesUserViaHub: true,
    label: "Apple Watch",
    note: "Sincroniza con la app Salud del iPhone. No hace falta vincularlo dentro de EvoFit.",
  },
  {
    id: "fitbit_pixel",
    hub: "health_connect",
    status: "later",
    reachesUserViaHub: true,
    label: "Fitbit / Pixel Watch",
    note: "Si su app ya escribe en Apple Salud o Health Connect, EvoFit verá esos datos.",
  },
  {
    id: "galaxy_watch",
    hub: "health_connect",
    status: "later",
    reachesUserViaHub: true,
    label: "Samsung Galaxy Watch",
    note: "Si Samsung Health comparte con Health Connect (o escribe en Apple Salud), EvoFit lo leerá.",
  },
  {
    id: "garmin",
    hub: "apple_health",
    status: "later",
    reachesUserViaHub: true,
    label: "Garmin",
    note: "Si Garmin Connect ya exporta a Apple Salud / Health Connect, EvoFit usará esos datos. API directa más adelante.",
  },
  {
    id: "polar",
    hub: "apple_health",
    status: "later",
    reachesUserViaHub: true,
    label: "Polar",
    note: "Si Polar Flow ya escribe en el hub del sistema, EvoFit lo leerá. AccessLink más adelante.",
  },
  {
    id: "amazfit",
    hub: "apple_health",
    status: "later",
    reachesUserViaHub: true,
    label: "Amazfit",
    note: "Si Zepp / Amazfit retransmite a Apple Salud o Health Connect, EvoFit verá esos datos.",
  },
] as const;

export function getMvpHubForPlatform(
  platform: "ios" | "android" | string
): HealthHubId {
  return platform === "android" ? "health_connect" : "apple_health";
}

export function getEcosystemsForHub(hub: HealthHubId): HealthEcosystem[] {
  return HEALTH_ECOSYSTEMS.filter((item) => item.hub === hub);
}

export function getWatchNotesForPlatform(
  platform: "ios" | "android" | string
): string[] {
  if (platform === "android") {
    return [
      "Pixel Watch, Fitbit y Galaxy Watch: si escriben en Health Connect, EvoFit los lee.",
      "Garmin, Polar o Amazfit: visibles si ya sincronizan con Health Connect. Conexión directa con cada marca más adelante.",
    ];
  }

  return [
    "Apple Watch: sincroniza con la app Salud del iPhone. No hace falta vincularlo dentro de EvoFit.",
    "Fitbit, Garmin, Polar, Samsung o Amazfit: si su app ya escribe en Apple Salud, EvoFit verá esos datos. La conexión directa con cada marca llegará más adelante.",
  ];
}
