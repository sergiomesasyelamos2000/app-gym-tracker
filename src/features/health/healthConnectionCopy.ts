import { getWatchNotesForPlatform } from "./healthHubCatalog";
import type { HealthAuthorizationStatus } from "./types";

export type HealthConnectionPresentation = {
  sectionTitle: string;
  explainer: string;
  connectTitle: string;
  statusSubtitle: string;
  deniedAlertTitle: string;
  deniedBody: string;
  unavailableAlertTitle: string;
  unavailableBody: string;
  writeTitle: string;
  writeSubtitle: string;
  restTitle: string;
  restIdleSubtitle: string;
  connectingSubtitle: string;
  watchNotes: string[];
};

type PresentationInput = {
  platform: "ios" | "android" | string;
  status: HealthAuthorizationStatus;
  hasRequestedAuthorization: boolean;
  isConnecting?: boolean;
};

function isIos(platform: string): boolean {
  return platform === "ios";
}

export function getHealthConnectionPresentation({
  platform,
  status,
  hasRequestedAuthorization,
  isConnecting = false,
}: PresentationInput): HealthConnectionPresentation {
  const ios = isIos(platform);

  let statusSubtitle: string;
  if (isConnecting) {
    statusSubtitle = "Conectando...";
  } else if (status === "granted") {
    statusSubtitle = ios
      ? "Conectado a Apple Salud"
      : "Conectado a Health Connect";
  } else if (status === "denied") {
    statusSubtitle = "Permiso denegado";
  } else if (status === "unavailable") {
    statusSubtitle = "No disponible en este dispositivo";
  } else if (hasRequestedAuthorization) {
    statusSubtitle = ios
      ? "Permiso solicitado. Si no ves datos, revisa Ajustes > Salud > Acceso de apps y datos > EvoFit."
      : "Permiso solicitado. Si no ves datos, revisa permisos en Health Connect.";
  } else {
    statusSubtitle =
      "Toca para permitir pulsaciones, calorías, sueño y pasos";
  }

  if (ios) {
    return {
      sectionTitle: "APPLE SALUD",
      explainer:
        "El Apple Watch y otras apps guardan pulsaciones, calorías, sueño y pasos en Apple Salud. EvoFit los lee desde ahí. No emparejamos el reloj por Bluetooth.",
      connectTitle: "Conectar Apple Salud",
      statusSubtitle,
      deniedAlertTitle: "Permiso denegado",
      deniedBody:
        "Activa Frecuencia cardiaca, Energía activa (calorías), Sueño y Pasos para EvoFit en Ajustes > Salud > Acceso de apps y datos > EvoFit. El Apple Watch no se vincula en esta pantalla.",
      unavailableAlertTitle: "Salud no disponible",
      unavailableBody:
        "Apple Salud no está disponible. Hace falta un build nativo en un iPhone compatible.",
      writeTitle: "Guardar entrenos en Apple Salud",
      writeSubtitle:
        "Al terminar una sesión, EvoFit puede escribir el entreno y las calorías activas.",
      restTitle: "Consejos de descanso",
      restIdleSubtitle: "Muestra sueño y pasos que ya estén en Apple Salud.",
      connectingSubtitle: "Conectando...",
      watchNotes: getWatchNotesForPlatform("ios"),
    };
  }

  return {
    sectionTitle: "HEALTH CONNECT",
    explainer:
      "Pixel Watch, Galaxy Watch, Fitbit y otras marcas compatibles envían los datos a Health Connect. EvoFit lee ese hub. No emparejamos el reloj por Bluetooth.",
    connectTitle: "Conectar Health Connect",
    statusSubtitle,
    deniedAlertTitle: "Permiso denegado",
    deniedBody:
      "Concede frecuencia cardiaca, calorías activas, sueño y pasos en Health Connect. El reloj no se vincula en esta pantalla.",
    unavailableAlertTitle: "Salud no disponible",
    unavailableBody:
      "Health Connect no está disponible. Instálalo desde Play Store y usa un build nativo de EvoFit.",
    writeTitle: "Guardar entrenos en Health Connect",
    writeSubtitle:
      "Al terminar una sesión, EvoFit puede escribir el entreno y las calorías activas.",
    restTitle: "Consejos de descanso",
    restIdleSubtitle: "Muestra sueño y pasos que ya estén en Health Connect.",
    connectingSubtitle: "Conectando...",
    watchNotes: getWatchNotesForPlatform("android"),
  };
}

export const ACCOUNT_DELETE_SUBSCRIPTION_NOTICE =
  "Esto borra tu cuenta y tus datos en EvoFit. No cancela una suscripción de la App Store: cancélala en Ajustes del iPhone > [tu nombre] > Suscripciones, o desde Gestionar en App Store.";
