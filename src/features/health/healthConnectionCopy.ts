import { getWatchNotesForPlatform } from "./healthHubCatalog";
import { isHealthHubConnected } from "./healthHubConnection";
import type { HealthAuthorizationStatus } from "./types";

export type HealthConnectionPresentation = {
  sectionTitle: string;
  explainer: string;
  /** Short line under the Connect CTA when disconnected. */
  connectHint: string;
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
  manageTitle: string;
  manageSubtitle: string;
  disconnectTitle: string;
  /** Play Store CTA when Health Connect is missing / needs update. */
  installTitle: string;
  installSubtitle: string;
  installAlertTitle: string;
  installAlertBody: string;
  installAlertAction: string;
  /** True when UI should show connected layout (sync switch, etc.). */
  showConnectedControls: boolean;
  watchNotes: string[];
};

export type HealthFinishPromptCopy = {
  title: string;
  body: string;
  accept: string;
  decline: string;
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
  const connected = isHealthHubConnected({
    status,
    hasRequestedAuthorization,
  });

  let statusSubtitle: string;
  if (isConnecting) {
    statusSubtitle = "Conectando...";
  } else if (status === "unavailable") {
    statusSubtitle = "No disponible en este build";
  } else if (status === "denied" && hasRequestedAuthorization) {
    statusSubtitle = ios
      ? "Conectado · escritura limitada — revisa Ajustes > Salud > EvoFit"
      : "Conectado · escritura limitada — revisa Health Connect";
  } else if (connected) {
    statusSubtitle = ios
      ? "Conectado a Apple Salud"
      : "Conectado a Health Connect";
  } else {
    statusSubtitle = ios
      ? "Toca para permitir que EvoFit lea y escriba en Apple Salud"
      : "Toca para permitir que EvoFit lea y escriba en Health Connect";
  }

  if (ios) {
    return {
      sectionTitle: "APPLE SALUD",
      explainer:
        "Amazfit, Apple Watch y otras apps guardan pulsaciones, calorías, sueño y pasos en Apple Salud. EvoFit los lee desde ahí. No emparejamos el reloj por Bluetooth.",
      connectHint:
        "Al terminar un entreno, se puede guardar en Salud. Puedes desactivarlo cuando quieras.",
      connectTitle: "Conectar Apple Salud",
      statusSubtitle,
      deniedAlertTitle: "Permiso de escritura denegado",
      deniedBody:
        "En Ajustes > Salud > Acceso de apps y datos > EvoFit activa Frecuencia cardiaca, Energía activa, Sueño, Pasos y Entrenamientos. Si EvoFit no aparece en esa lista, vuelve a tocar Conectar o reinstala el build de TestFlight.",
      unavailableAlertTitle: "Salud no disponible",
      unavailableBody:
        "Este build no puede hablar con Apple Salud (módulo nativo ausente o HealthKit no habilitado en el App ID). Necesitas un build nativo/TestFlight con HealthKit. Si tras Conectar EvoFit no sale en Ajustes > Salud, regenera el perfil con la capability HealthKit.",
      writeTitle: "Sincronizar entrenos",
      writeSubtitle:
        "Al terminar una sesión, EvoFit escribe el entreno y las calorías activas en Apple Salud.",
      restTitle: "Consejos de descanso",
      restIdleSubtitle: "Muestra sueño y pasos que ya estén en Apple Salud.",
      connectingSubtitle: "Conectando...",
      connectSuccessTitle: "Conectado a Apple Salud",
      connectSuccessBody:
        "Los entrenos se guardarán en Salud al terminarlos. Puedes desactivar la sincronización aquí cuando quieras. Si iOS mostró el diálogo, revisa también Ajustes > Salud > Acceso de apps y datos > EvoFit.",
      manageTitle: "Gestionar en Ajustes",
      manageSubtitle: "Abre los permisos de Salud para EvoFit.",
      disconnectTitle: "Desconectar",
      installTitle: "Instalar",
      installSubtitle: "",
      installAlertTitle: "Salud no disponible",
      installAlertBody:
        "Este build no puede hablar con Apple Salud (módulo nativo ausente o HealthKit no habilitado).",
      installAlertAction: "Entendido",
      showConnectedControls: connected,
      watchNotes: getWatchNotesForPlatform("ios"),
    };
  }

  return {
    sectionTitle: "HEALTH CONNECT",
    explainer:
      "EvoFit escribe y lee en Health Connect (como Hevy). Google Fit, Samsung Health y el reloj reciben esos datos solo si también están conectados a Health Connect. No emparejamos el reloj por Bluetooth.",
    connectHint:
      "1) Instala Health Connect si hace falta. 2) Conecta EvoFit. 3) En Google Fit / Samsung Health activa también Health Connect. Al terminar un entreno se sincroniza por defecto.",
    connectTitle: "Conectar Health Connect",
    statusSubtitle,
    deniedAlertTitle: "Permiso denegado",
    deniedBody:
      "En Health Connect > Permisos de apps > EvoFit concede frecuencia cardiaca, calorías activas, sueño, pasos y entrenamientos. Luego abre Gestionar para revisarlos.",
    unavailableAlertTitle: "Health Connect no listo",
    unavailableBody:
      "Instala o actualiza Health Connect desde Play Store y vuelve a tocar Conectar. Sin Health Connect, EvoFit no puede sincronizar entrenos ni leer el reloj.",
    writeTitle: "Sincronizar entrenos",
    writeSubtitle:
      "Al terminar una sesión, EvoFit escribe el entreno (fuerza) y las calorías activas en Health Connect.",
    restTitle: "Consejos de descanso",
    restIdleSubtitle: "Muestra sueño y pasos que ya estén en Health Connect.",
    connectingSubtitle: "Conectando...",
    connectSuccessTitle: "Conectado a Health Connect",
    connectSuccessBody:
      "Los entrenos se guardarán en Health Connect al terminarlos. Para verlos en Google Fit o Samsung Health, conecta también esas apps a Health Connect y concede permisos. Puedes desactivar la sincronización aquí cuando quieras.",
    manageTitle: "Gestionar en Health Connect",
    manageSubtitle:
      "Abre Health Connect para permisos de EvoFit (y de Fit / Samsung).",
    disconnectTitle: "Desconectar",
    installTitle: "Instalar Health Connect",
    installSubtitle:
      "Obligatorio en Android. Después conecta también Google Fit o Samsung Health a Health Connect si quieres ver los entrenos ahí.",
    installAlertTitle: "Instalar Health Connect",
    installAlertBody:
      "Health Connect es el hub de Android. EvoFit no habla directo con Google Fit ni Samsung Health: escribe en Health Connect y esas apps lo leen si están conectadas.",
    installAlertAction: "Abrir Play Store",
    showConnectedControls: connected,
    watchNotes: getWatchNotesForPlatform("android"),
  };
}

export function getHealthFinishPromptCopy(
  platform: string
): HealthFinishPromptCopy {
  const hub = isIos(platform) ? "Apple Salud" : "Health Connect";
  return {
    title: `¿Guardar en ${hub}?`,
    body: isIos(platform)
      ? `Puedes sincronizar este entreno con Apple Salud. Si aceptas, iOS pedirá permiso. Puedes desactivarlo después en Perfil.`
      : `Puedes sincronizar este entreno con Health Connect. Si aceptas, se pedirán permisos. Puedes desactivarlo después en Perfil.`,
    accept: "Sí, conectar",
    decline: "Ahora no",
  };
}

export const ACCOUNT_DELETE_SUBSCRIPTION_NOTICE =
  "Esto borra tu cuenta y tus datos en EvoFit. No cancela una suscripción de la App Store: cancélala en Ajustes del iPhone > [tu nombre] > Suscripciones, o desde Gestionar en App Store.";
