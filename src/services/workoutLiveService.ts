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

export type WorkoutLiveIntentAction =
  | "add"
  | "subtract"
  | "skip"
  | "completeSet";

export interface WorkoutLiveIntentEvent {
  action: WorkoutLiveIntentAction;
  delta: number;
  endTimestampMs?: number | null;
  source?: "intent" | "url";
}

export interface WorkoutLiveSnapshot {
  workoutStartedAtMs: number;
  exerciseName: string;
  imageUrl?: string | null;
  nextSetSummary?: string | null;
  isResting: boolean;
  restEndAtMs?: number | null;
  /** Default rest length used when completing a set from the widget (seconds). */
  restSecondsDefault?: number | null;
}

export interface RestTimerLiveState {
  isActive: boolean;
  endTimestampMs?: number | null;
  exerciseName?: string | null;
  imageFileName?: string | null;
  nextSetSummary?: string | null;
  workoutStartedAtMs?: number | null;
  isResting?: boolean | null;
}

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

export const pollNativeIntent = () => {
  if (Platform.OS !== "ios" || !IOSIntentModule?.pollPendingIntent) return;
  IOSIntentModule.pollPendingIntent().catch(() => {});
};

const parseWorkoutLiveActionURL = (
  url: string
): WorkoutLiveIntentEvent | null => {
  const match = url.match(
    /^com\.smy862\.app:\/\/(?:rest-timer|workout-live)\/(add|subtract|skip|completeSet)(?:[/?#].*)?$/
  );
  if (!match) return null;

  const action = match[1] as WorkoutLiveIntentAction;
  return {
    action,
    delta: action === "add" ? 15 : action === "subtract" ? -15 : 0,
    source: "url",
  };
};

function snapshotToArgs(snapshot: WorkoutLiveSnapshot) {
  return [
    snapshot.workoutStartedAtMs,
    snapshot.exerciseName ?? null,
    snapshot.imageUrl ?? null,
    snapshot.nextSetSummary ?? null,
    snapshot.isResting,
    snapshot.restEndAtMs ?? null,
    snapshot.restSecondsDefault ?? null,
  ] as const;
}

function normalizeRestEnd(ms?: number | null): number | null {
  if (ms == null || !Number.isFinite(ms)) return null;
  // Quantize to 1s so sub-second JS drift does not thrash native updates.
  return Math.round(ms / 1000) * 1000;
}

function snapshotsEqual(
  a: WorkoutLiveSnapshot | null,
  b: WorkoutLiveSnapshot
): boolean {
  if (!a) return false;
  return (
    a.workoutStartedAtMs === b.workoutStartedAtMs &&
    a.exerciseName === b.exerciseName &&
    (a.imageUrl ?? null) === (b.imageUrl ?? null) &&
    (a.nextSetSummary ?? null) === (b.nextSetSummary ?? null) &&
    a.isResting === b.isResting &&
    normalizeRestEnd(a.restEndAtMs) === normalizeRestEnd(b.restEndAtMs) &&
    (a.restSecondsDefault ?? null) === (b.restSecondsDefault ?? null)
  );
}

let lastSentSnapshot: WorkoutLiveSnapshot | null = null;

export const startWorkoutLive = async (
  snapshot: WorkoutLiveSnapshot
): Promise<void> => {
  const module = getModule();
  if (!module) return;
  const normalized: WorkoutLiveSnapshot = {
    ...snapshot,
    restEndAtMs: normalizeRestEnd(snapshot.restEndAtMs),
  };
  try {
    if (typeof module.startWorkoutLive === "function") {
      await module.startWorkoutLive(...snapshotToArgs(normalized));
      lastSentSnapshot = normalized;
      return;
    }
    // Legacy rest-only native module fallback.
    if (normalized.isResting && normalized.restEndAtMs) {
      await module.startRestTimer(
        normalized.restEndAtMs,
        normalized.exerciseName,
        normalized.imageUrl,
        normalized.nextSetSummary
      );
      lastSentSnapshot = normalized;
    }
  } catch (e) {
    console.warn("[WorkoutLive] startWorkoutLive failed", e);
  }
};

export const updateWorkoutLive = async (
  snapshot: Partial<WorkoutLiveSnapshot> &
    Pick<WorkoutLiveSnapshot, "workoutStartedAtMs" | "exerciseName">
): Promise<void> => {
  const module = getModule();
  if (!module) return;

  // Reuse last image when caller omits it (undefined) to avoid native re-decode.
  const resolvedImage =
    snapshot.imageUrl !== undefined
      ? snapshot.imageUrl
      : lastSentSnapshot?.imageUrl ?? null;

  const full: WorkoutLiveSnapshot = {
    workoutStartedAtMs: snapshot.workoutStartedAtMs,
    exerciseName: snapshot.exerciseName,
    imageUrl: resolvedImage,
    nextSetSummary:
      snapshot.nextSetSummary !== undefined
        ? snapshot.nextSetSummary
        : lastSentSnapshot?.nextSetSummary ?? null,
    isResting: Boolean(snapshot.isResting),
    restEndAtMs: normalizeRestEnd(
      snapshot.restEndAtMs !== undefined
        ? snapshot.restEndAtMs
        : lastSentSnapshot?.restEndAtMs
    ),
    restSecondsDefault:
      snapshot.restSecondsDefault !== undefined
        ? snapshot.restSecondsDefault
        : lastSentSnapshot?.restSecondsDefault ?? null,
  };

  if (snapshotsEqual(lastSentSnapshot, full)) {
    return;
  }

  // If only non-image fields changed, do not resend the same image URL (Android
  // would otherwise spawn another decode thread on every update).
  const imageForNative =
    lastSentSnapshot &&
    (lastSentSnapshot.imageUrl ?? null) === (full.imageUrl ?? null)
      ? null
      : full.imageUrl;

  const nativeSnapshot: WorkoutLiveSnapshot = {
    ...full,
    imageUrl: imageForNative,
  };

  try {
    if (typeof module.updateWorkoutLive === "function") {
      await module.updateWorkoutLive(...snapshotToArgs(nativeSnapshot));
      lastSentSnapshot = full;
      return;
    }
    if (full.isResting && full.restEndAtMs) {
      await module.updateRestTimer(
        full.restEndAtMs,
        full.exerciseName,
        imageForNative,
        full.nextSetSummary
      );
      lastSentSnapshot = full;
    }
  } catch (e) {
    console.warn("[WorkoutLive] updateWorkoutLive failed", e);
  }
};

export const endWorkoutLive = async (): Promise<void> => {
  const module = getModule();
  if (!module) return;
  try {
    if (typeof module.endWorkoutLive === "function") {
      await module.endWorkoutLive();
      lastSentSnapshot = null;
      return;
    }
    await module.endRestTimer?.();
    lastSentSnapshot = null;
  } catch (e) {
    console.warn("[WorkoutLive] endWorkoutLive failed", e);
  }
};

/** @deprecated Prefer startWorkoutLive with isResting */
export const startRestTimerLive = async (
  endTimestampMs: number,
  exerciseName?: string,
  imageUrl?: string | null,
  nextSetSummary?: string | null,
  workoutStartedAtMs?: number
): Promise<void> => {
  await updateWorkoutLive({
    workoutStartedAtMs: workoutStartedAtMs ?? Date.now(),
    exerciseName: exerciseName ?? "Descanso",
    imageUrl,
    nextSetSummary,
    isResting: true,
    restEndAtMs: endTimestampMs,
  });
};

/** @deprecated Prefer updateWorkoutLive */
export const updateRestTimerLive = async (
  endTimestampMs: number,
  exerciseName?: string,
  imageUrl?: string | null,
  nextSetSummary?: string | null,
  workoutStartedAtMs?: number
): Promise<void> => {
  await updateWorkoutLive({
    workoutStartedAtMs: workoutStartedAtMs ?? Date.now(),
    exerciseName: exerciseName ?? "Descanso",
    imageUrl,
    nextSetSummary,
    isResting: true,
    restEndAtMs: endTimestampMs,
  });
};

/** @deprecated Prefer endWorkoutLive when finishing workout; for rest-only clear use updateWorkoutLive */
export const endRestTimerLive = async (): Promise<void> => {
  const module = getModule();
  if (!module) return;
  try {
    // Clear rest mode but keep workout live if supported.
    if (typeof module.clearRestLive === "function") {
      await module.clearRestLive();
      return;
    }
    if (typeof module.endRestTimer === "function") {
      // On legacy Android this cancels the whole notification — callers
      // that still need workout live should use updateWorkoutLive instead.
      await module.endRestTimer();
    }
  } catch (e) {
    console.warn("[WorkoutLive] endRestTimerLive failed", e);
  }
};

export const getCurrentRestTimerLiveState =
  async (): Promise<RestTimerLiveState | null> => {
    if (Platform.OS !== "ios") return null;
    try {
      if (typeof IOSLiveActivity?.getCurrentWorkoutLiveState === "function") {
        return (await IOSLiveActivity.getCurrentWorkoutLiveState()) as RestTimerLiveState;
      }
      if (typeof IOSLiveActivity?.getCurrentRestTimerState === "function") {
        return (await IOSLiveActivity.getCurrentRestTimerState()) as RestTimerLiveState;
      }
      return null;
    } catch (e) {
      console.warn("[WorkoutLive] getCurrentState failed", e);
      return null;
    }
  };

export const consumeAppTerminatedAt = async (): Promise<number | null> => {
  if (Platform.OS !== "ios" || !IOSIntentModule?.consumeAppTerminatedAt) {
    return null;
  }
  try {
    const value = await IOSIntentModule.consumeAppTerminatedAt();
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  } catch (e) {
    console.warn("[WorkoutLive] consumeAppTerminatedAt failed", e);
    return null;
  }
};

export const consumePendingCompleteSet = async (): Promise<boolean> => {
  if (Platform.OS !== "ios" || !IOSIntentModule?.consumePendingCompleteSet) {
    return false;
  }
  try {
    return Boolean(await IOSIntentModule.consumePendingCompleteSet());
  } catch {
    return false;
  }
};

export const subscribeToWorkoutLiveIntents = (
  handler: (event: WorkoutLiveIntentEvent) => void
): (() => void) => {
  if (Platform.OS === "android") {
    const sub = DeviceEventEmitter.addListener("onRestTimerIntent", (raw) => {
      handler({ ...(raw as WorkoutLiveIntentEvent), source: "intent" });
    });
    const sub2 = DeviceEventEmitter.addListener(
      "onWorkoutLiveIntent",
      (raw) => {
        handler({ ...(raw as WorkoutLiveIntentEvent), source: "intent" });
      }
    );
    return () => {
      sub.remove();
      sub2.remove();
    };
  }

  const emitter = getEmitter();
  let lastHandledURL: string | null = null;
  let lastHandledURLAt = 0;

  const handleURL = (url: string | null | undefined) => {
    if (!url) return;
    const event = parseWorkoutLiveActionURL(url);
    if (!event) return;
    const now = Date.now();
    if (url === lastHandledURL && now - lastHandledURLAt < 750) return;
    lastHandledURL = url;
    lastHandledURLAt = now;
    handler(event);
  };

  const eventSub = emitter?.addListener("onRestTimerIntent", (raw) => {
    handler({ ...(raw as WorkoutLiveIntentEvent), source: "intent" });
  });
  const eventSub2 = emitter?.addListener("onWorkoutLiveIntent", (raw) => {
    handler({ ...(raw as WorkoutLiveIntentEvent), source: "intent" });
  });

  const urlSub = Linking.addEventListener("url", ({ url }) => handleURL(url));
  Linking.getInitialURL()
    .then(handleURL)
    .catch(() => {});

  pollNativeIntent();

  const appStateSub = AppState.addEventListener("change", (state) => {
    if (state === "active") {
      pollNativeIntent();
    }
  });

  return () => {
    eventSub?.remove();
    eventSub2?.remove();
    urlSub.remove();
    appStateSub.remove();
  };
};

/** @deprecated Prefer subscribeToWorkoutLiveIntents */
export const subscribeToRestTimerIntents = subscribeToWorkoutLiveIntents;
