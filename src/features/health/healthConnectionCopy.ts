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
  /** Shown after Connect when the system sheet path succeeded. */
  connectSuccessTitle: string;
  connectSuccessBody: string;
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
    statusSubtitle = hasRequestedAuthorization
      ? ios
        ? "Escritura denegada. La lectura puede seguir activa — revisa Ajustes > Salud > EvoFit."
        : "Escritura denegada. Revisa permisos en Health Connect."
      : "Permiso denegado";
  } else if (status === "unavailable") {
    statusSubtitle = "No disponible en este build";
  } else if (hasRequestedAuthorization) {
    statusSubtitle = ios
      ? "Permiso solicitado. Debe aparecer EvoFit en Ajustes > Salud > Acceso de apps y datos."
      : "Permiso solicitado. Si no ves datos, revisa permisos en Health Connect.";
  } else {
    statusSubtitle =
      "Toca para permitir pulsaciones, calorías, sueño y pasos";
  }

  if (ios) {
    return {
      sectionTitle: "APPLE SALUD",
      explainer:
        "Amazfit, Apple Watch y otras apps guardan pulsaciones, calorías, sueño y pasos en Apple Salud. EvoFit los lee desde ahí. No emparejamos el reloj por Bluetooth.",
      connectTitle: "Conectar Apple Salud",
      statusSubtitle,
      deniedAlertTitle: "Permiso de escritura denegado",
      deniedBody:
        "En Ajustes > Salud > Acceso de apps y datos > EvoFit activa Frecuencia cardiaca, Energía activa, Sueño, Pasos y Entrenamientos. Si EvoFit no aparece en esa lista, vuelve a tocar Conectar o reinstala el build de TestFlight.",
      unavailableAlertTitle: "Salud no disponible",
      unavailableBody:
        "Este build no puede hablar con Apple Salud (módulo nativo ausente o HealthKit no habilitado en el App ID). Necesitas un build nativo/TestFlight con HealthKit. Si tras Conectar EvoFit no sale en Ajustes > Salud, regenera el perfil con la capability HealthKit.",
      writeTitle: "Guardar entrenos en Apple Salud",
      writeSubtitle:
        "Al terminar una sesión, EvoFit puede escribir el entreno y las calorías activas.",
      restTitle: "Consejos de descanso",
      restIdleSubtitle: "Muestra sueño y pasos que ya estén en Apple Salud.",
      connectingSubtitle: "Conectando...",
      connectSuccessTitle: "Permiso solicitado",
      connectSuccessBody:
        "Si iOS mostró el diálogo, EvoFit debe aparecer en Ajustes > Salud > Acceso de apps y datos. Activa lectura (FC, calorías, sueño, pasos) y escritura (entrenamientos). Los datos del Amazfit llegan vía Zepp → Apple Salud.",
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
    connectSuccessTitle: "Permiso solicitado",
    connectSuccessBody:
      "Revisa en Health Connect que EvoFit tenga lectura y escritura de los datos de salud.",
    watchNotes: getWatchNotesForPlatform("android"),
  };
}

export const ACCOUNT_DELETE_SUBSCRIPTION_NOTICE =
  "Esto borra tu cuenta y tus datos en EvoFit. No cancela una suscripción de la App Store: cancélala en Ajustes del iPhone > [tu nombre] > Suscripciones, o desde Gestionar en App Store.";
