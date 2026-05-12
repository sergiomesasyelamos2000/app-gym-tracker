import {
  AppState,
  DeviceEventEmitter,
  Linking,
  NativeEventEmitter,
  NativeModules,
  Platform,
} from "react-native";

const IOSLiveActivity = NativeModules.RestTimerLiveActivity;
const IOSIntentModule = NativeModules.RestTimerLiveActivityModule;
const AndroidModule = NativeModules.RestTimerNotification;

export type IntentAction = "add" | "subtract" | "skip";

export interface RestTimerIntentEvent {
  action: IntentAction;
  delta: number;
  endTimestampMs?: number | null;
  source?: "intent" | "url";
}

export interface RestTimerLiveState {
  isActive: boolean;
  endTimestampMs?: number | null;
  exerciseName?: string | null;
  imageFileName?: string | null;
  nextSetSummary?: string | null;
}

// Singleton del emitter — se crea una sola vez
let _emitter: NativeEventEmitter | null = null;
const getEmitter = (): NativeEventEmitter | null => {
  if (Platform.OS !== "ios") return null;
  if (!_emitter && IOSIntentModule) {
    _emitter = new NativeEventEmitter(IOSIntentModule);
  }
  return _emitter;
};

const getModule = () => {
  if (Platform.OS === "android") return AndroidModule;
  if (Platform.OS === "ios") return IOSLiveActivity;
  return null;
};

// Hace poll explícito al módulo nativo para que emita
// cualquier intent pendiente en UserDefaults.
const pollNativeIntent = () => {
  if (Platform.OS !== "ios" || !IOSIntentModule?.pollPendingIntent) return;
  IOSIntentModule.pollPendingIntent().catch(() => {});
};

const parseRestTimerActionURL = (url: string): RestTimerIntentEvent | null => {
  const match = url.match(
    /^com\.smy862\.app:\/\/rest-timer\/(add|subtract|skip)(?:[/?#].*)?$/
  );
  if (!match) return null;

  const action = match[1] as IntentAction;
  return {
    action,
    delta: action === "add" ? 15 : action === "subtract" ? -15 : 0,
    source: "url",
  };
};

// MARK: - API pública

export const startRestTimerLive = async (
  totalSeconds: number,
  exerciseName?: string,
  imageUrl?: string | null,
  nextSetSummary?: string | null
): Promise<void> => {
  const module = getModule();
  if (!module) return;
  try {
    const endsAtMs = Date.now() + Math.max(0, Math.floor(totalSeconds)) * 1000;
    await module.startRestTimer(
      endsAtMs,
      exerciseName ?? null,
      imageUrl ?? null,
      nextSetSummary ?? null
    );
  } catch (e) {
    console.warn("[RestTimerLive] startRestTimer failed", e);
  }
};

export const updateRestTimerLive = async (
  remainingSeconds: number,
  exerciseName?: string,
  imageUrl?: string | null,
  nextSetSummary?: string | null
): Promise<void> => {
  const module = getModule();
  if (!module) return;
  try {
    const endsAtMs =
      Date.now() + Math.max(0, Math.floor(remainingSeconds)) * 1000;
    await module.updateRestTimer(
      endsAtMs,
      exerciseName ?? null,
      imageUrl ?? null,
      nextSetSummary ?? null
    );
  } catch (e) {
    console.warn("[RestTimerLive] updateRestTimer failed", e);
  }
};

export const endRestTimerLive = async (): Promise<void> => {
  const module = getModule();
  if (!module) return;
  try {
    await module.endRestTimer();
  } catch (e) {
    console.warn("[RestTimerLive] endRestTimer failed", e);
  }
};

export const getCurrentRestTimerLiveState =
  async (): Promise<RestTimerLiveState | null> => {
    if (Platform.OS !== "ios" || !IOSLiveActivity?.getCurrentRestTimerState) {
      return null;
    }
    try {
      return (await IOSLiveActivity.getCurrentRestTimerState()) as RestTimerLiveState;
    } catch (e) {
      console.warn("[RestTimerLive] getCurrentRestTimerState failed", e);
      return null;
    }
  };

/**
 * Suscríbete a los intents del Live Activity.
 *
 * Estrategia de recepción (iOS):
 *  1. El intent escribe en UserDefaults y abre la app (openAppWhenRun=true).
 *  2. UIApplication.didBecomeActiveNotification (Swift) hace poll automático.
 *  3. AppState 'active' (JS) llama a pollNativeIntent() como red de seguridad.
 *  4. pollPendingIntent() al montar el listener, por si había un intent previo.
 *
 * Devuelve la función de limpieza para useEffect.
 */
export const subscribeToRestTimerIntents = (
  handler: (event: RestTimerIntentEvent) => void
): (() => void) => {
  if (Platform.OS === "android") {
    const sub = DeviceEventEmitter.addListener("onRestTimerIntent", handler);
    return () => sub.remove();
  }

  const emitter = getEmitter();
  let lastHandledURL: string | null = null;
  let lastHandledURLAt = 0;

  const handleURL = (url: string | null | undefined) => {
    if (!url) return;

    const event = parseRestTimerActionURL(url);
    if (!event) return;

    const now = Date.now();
    if (url === lastHandledURL && now - lastHandledURLAt < 750) return;

    lastHandledURL = url;
    lastHandledURLAt = now;
    console.log("[RestTimerIntent] received URL", url);
    handler(event);
  };

  const eventSub = emitter?.addListener("onRestTimerIntent", (raw) => {
    console.log("[RestTimerIntent] received", raw);
    handler({ ...(raw as RestTimerIntentEvent), source: "intent" });
  });

  const urlSub = Linking.addEventListener("url", ({ url }) => handleURL(url));
  Linking.getInitialURL()
    .then(handleURL)
    .catch(() => {});

  // 2. Poll inmediato al montar (intent previo al mount del listener)
  pollNativeIntent();

  // 3. Poll cada vez que la app vuelve a foreground
  const appStateSub = AppState.addEventListener("change", (state) => {
    if (state === "active") {
      console.log("[RestTimerIntent] AppState active → poll");
      pollNativeIntent();
    }
  });

  return () => {
    eventSub?.remove();
    urlSub.remove();
    appStateSub.remove();
  };
};
