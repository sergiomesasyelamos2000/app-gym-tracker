import { NativeEventEmitter, NativeModules, Platform } from "react-native";

const AndroidModule = NativeModules.RestTimerNotification;
const IOSModule = NativeModules.RestTimerLiveActivity;

type IntentAction = "add" | "subtract" | "skip";

export interface RestTimerIntentEvent {
  action: IntentAction;
  delta: number; // segundos; 0 cuando action === "skip"
}

let _intentEmitter: NativeEventEmitter | null = null;

const getEmitter = (): NativeEventEmitter | null => {
  if (Platform.OS !== "ios") return null;
  if (!_intentEmitter && NativeModules.RestTimerLiveActivityModule) {
    _intentEmitter = new NativeEventEmitter(
      NativeModules.RestTimerLiveActivityModule
    );
  }
  return _intentEmitter;
};

const getModule = () => {
  if (Platform.OS === "android") return AndroidModule;
  if (Platform.OS === "ios") return IOSModule;
  return null;
};

export const startRestTimerLive = async (
  totalSeconds: number,
  exerciseName?: string,
  imageUrl?: string | null,
  nextSetSummary?: string | null
) => {
  const module = getModule();
  if (!module) {
    console.warn("[RestTimerLive] native module not available");
    return;
  }
  try {
    const endsAtMs = Date.now() + Math.max(0, Math.floor(totalSeconds)) * 1000;
    await module.startRestTimer(
      endsAtMs,
      exerciseName ?? null,
      imageUrl ?? null,
      nextSetSummary ?? null
    );
  } catch (error) {
    console.warn("RestTimerLive start failed", error);
  }
};

export const updateRestTimerLive = async (
  remainingSeconds: number,
  exerciseName?: string,
  imageUrl?: string | null,
  nextSetSummary?: string | null
) => {
  const module = getModule();
  if (!module) {
    console.warn("[RestTimerLive] native module not available");
    return;
  }
  try {
    const endsAtMs =
      Date.now() + Math.max(0, Math.floor(remainingSeconds)) * 1000;
    await module.updateRestTimer(
      endsAtMs,
      exerciseName ?? null,
      imageUrl ?? null,
      nextSetSummary ?? null
    );
  } catch (error) {
    console.warn("RestTimerLive update failed", error);
  }
};

export const endRestTimerLive = async () => {
  const module = getModule();
  if (!module) {
    console.warn("[RestTimerLive] native module not available");
    return;
  }
  try {
    await module.endRestTimer();
  } catch (error) {
    console.warn("RestTimerLive end failed", error);
  }
};

/**
 * Suscríbete a los intents de la pantalla bloqueada.
 * Devuelve una función de limpieza — llámala en el useEffect cleanup.
 */
export const subscribeToRestTimerIntents = (
  handler: (event: RestTimerIntentEvent) => void
): (() => void) => {
  const emitter = getEmitter();
  if (!emitter) return () => {};

  const subscription = emitter.addListener("onRestTimerIntent", handler);
  return () => subscription.remove();
};
