import {
  AppState,
  DeviceEventEmitter,
  Linking,
  NativeEventEmitter,
  NativeModules,
  Platform,
} from "react-native";
import {
  toLiveActivityImageUrl,
  toNativeProgress,
  type WorkoutLiveProgress,
} from "./workoutLiveImage";
import {
  shouldAcceptWorkoutLiveClearRest,
  shouldAcceptWorkoutLiveWrite,
  type WorkoutLiveWriteGate,
} from "./workoutLiveWriteGate";
import { createLatestWinsQueue } from "./workoutLiveUpdateQueue";

/** Blocks non-pause Live writes after leave-to-pause until resume/start/end. */
let writeGate: WorkoutLiveWriteGate = "open";

/** Latest-wins queue so rapid ±15 rest updates never apply out of order. */
const updateQueue = createLatestWinsQueue<WorkoutLiveSnapshot>();

export const lockWorkoutLiveForPause = (): void => {
  writeGate = "paused";
};

export const unlockWorkoutLiveWrites = (): void => {
  writeGate = "open";
};

const getIOSLiveActivity = () => NativeModules.RestTimerLiveActivity;
const getIOSIntentModule = () => NativeModules.RestTimerLiveActivityModule;
const getAndroidModule = () => NativeModules.RestTimerNotification;

export type WorkoutLiveIntentAction =
  | "add"
  | "subtract"
  | "skip"
  | "completeSet"
  | "open";

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
  /** iOS Live Activity only: routine name, exercise position and set counts. */
  progress?: WorkoutLiveProgress | null;
  /** When true, Live Activity / notification keep showing a frozen elapsed clock. */
  isPaused?: boolean;
  pausedElapsedSeconds?: number | null;
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
  const intentModule = getIOSIntentModule();
  if (!_emitter && intentModule) {
    _emitter = new NativeEventEmitter(intentModule);
  }
  return _emitter;
};

const getModule = () => {
  if (Platform.OS === "android") return getAndroidModule();
  if (Platform.OS === "ios") return getIOSLiveActivity();
  return null;
};

export const pollNativeIntent = () => {
  const intentModule = getIOSIntentModule();
  if (Platform.OS !== "ios" || !intentModule?.pollPendingIntent) return;
  intentModule.pollPendingIntent().catch(() => {});
};

const parseWorkoutLiveActionURL = (
  url: string
): WorkoutLiveIntentEvent | null => {
  const match = url.match(
    /^com\.smy862\.app:\/\/(?:rest-timer|workout-live)\/(add|subtract|skip|completeSet|open)(?:[/?#].*)?$/
  );
  if (!match) return null;

  const action = match[1] as WorkoutLiveIntentAction;
  return {
    action,
    delta: action === "add" ? 15 : action === "subtract" ? -15 : 0,
    source: "url",
  };
};

function pauseBridge(snapshot: WorkoutLiveSnapshot) {
  return {
    isPaused: Boolean(snapshot.isPaused),
    pausedElapsedSeconds: snapshot.pausedElapsedSeconds ?? null,
  };
}

function snapshotToArgs(snapshot: WorkoutLiveSnapshot) {
  const args: unknown[] = [
    snapshot.workoutStartedAtMs,
    snapshot.exerciseName ?? null,
    toLiveActivityImageUrl(snapshot.imageUrl),
    snapshot.nextSetSummary ?? null,
    snapshot.isResting,
    snapshot.restEndAtMs ?? null,
    snapshot.restSecondsDefault ?? null,
  ];
  if (Platform.OS === "ios") {
    // Pause fields travel inside progress so the ObjC bridge stays stable.
    args.push(toNativeProgress(snapshot.progress ?? {}, pauseBridge(snapshot)));
  } else if (Platform.OS === "android") {
    args.push(
      Boolean(snapshot.isPaused),
      snapshot.isPaused ? snapshot.pausedElapsedSeconds ?? 0 : null
    );
  }
  return args;
}

function progressKey(
  progress?: WorkoutLiveProgress | null,
  pause?: { isPaused?: boolean; pausedElapsedSeconds?: number | null }
): string {
  return JSON.stringify(toNativeProgress(progress ?? {}, pause));
}

/** Quantize only for dedupe — outbound / cache keep exact milliseconds. */
function normalizeRestEnd(ms?: number | null): number | null {
  if (ms == null || !Number.isFinite(ms)) return null;
  return Math.round(ms / 1000) * 1000;
}

/** Pass through finite rest ends without rounding (toast ↔ Island share one instant). */
function finiteRestEnd(ms?: number | null): number | null {
  if (ms == null || !Number.isFinite(ms)) return null;
  return ms;
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
    (a.restSecondsDefault ?? null) === (b.restSecondsDefault ?? null) &&
    Boolean(a.isPaused) === Boolean(b.isPaused) &&
    (a.isPaused
      ? (a.pausedElapsedSeconds ?? 0) === (b.pausedElapsedSeconds ?? 0)
      : true) &&
    progressKey(a.progress, pauseBridge(a)) ===
      progressKey(b.progress, pauseBridge(b))
  );
}

let lastSentSnapshot: WorkoutLiveSnapshot | null = null;

/** Test-only: reset dedupe cache, write gate, and update queue. */
export const resetWorkoutLiveStateForTests = (): void => {
  lastSentSnapshot = null;
  writeGate = "open";
  updateQueue.invalidate();
};

/** Keep JS dedupe cache aligned after native Island ±15 already updated Activity. */
export const noteWorkoutLiveRestEnd = (
  restEndAtMs: number | null,
  restSecondsDefault?: number | null
): void => {
  // Drop any queued toast write so it cannot overwrite the Island end.
  updateQueue.invalidate();
  if (!lastSentSnapshot) return;
  lastSentSnapshot = {
    ...lastSentSnapshot,
    isResting: restEndAtMs != null,
    restEndAtMs: finiteRestEnd(restEndAtMs),
    restSecondsDefault:
      restSecondsDefault !== undefined
        ? restSecondsDefault
        : lastSentSnapshot.restSecondsDefault,
  };
};

export const startWorkoutLive = async (
  snapshot: WorkoutLiveSnapshot
): Promise<void> => {
  const module = getModule();
  if (!module) return;
  // Resume / fresh start always re-opens writers after a leave-to-pause lock.
  unlockWorkoutLiveWrites();
  updateQueue.invalidate();
  const normalized: WorkoutLiveSnapshot = {
    ...snapshot,
    restEndAtMs: finiteRestEnd(snapshot.restEndAtMs),
    isPaused: Boolean(snapshot.isPaused),
    pausedElapsedSeconds: snapshot.isPaused
      ? snapshot.pausedElapsedSeconds ?? 0
      : null,
  };
  try {
    if (typeof module.startWorkoutLive === "function") {
      const result = await module.startWorkoutLive(
        ...snapshotToArgs(normalized)
      );
      if (result !== false) {
        lastSentSnapshot = normalized;
      }
      return;
    }
    // Legacy rest-only native module fallback.
    if (normalized.isResting && normalized.restEndAtMs) {
      await module.startRestTimer(
        normalized.restEndAtMs,
        normalized.exerciseName,
        toLiveActivityImageUrl(normalized.imageUrl),
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

  if (
    !shouldAcceptWorkoutLiveWrite(writeGate, {
      isPaused: snapshot.isPaused,
    })
  ) {
    return;
  }

  // Reuse last image when caller omits it (undefined) to avoid native re-decode.
  const resolvedImage =
    snapshot.imageUrl !== undefined
      ? snapshot.imageUrl
      : lastSentSnapshot?.imageUrl ?? null;

  const isResting = Boolean(snapshot.isResting);
  // When leaving rest, never reuse a stale end timestamp from the cache.
  const restEndAtMs = isResting
    ? finiteRestEnd(
        snapshot.restEndAtMs !== undefined
          ? snapshot.restEndAtMs
          : lastSentSnapshot?.restEndAtMs
      )
    : null;

  // Pause is opt-in per call. Omitting isPaused clears a frozen clock so
  // in-workout rest/set updates never keep a stale paused state.
  const isPaused = Boolean(snapshot.isPaused);
  const pausedElapsedSeconds = isPaused
    ? snapshot.pausedElapsedSeconds !== undefined
      ? snapshot.pausedElapsedSeconds
      : lastSentSnapshot?.pausedElapsedSeconds ?? 0
    : null;

  const full: WorkoutLiveSnapshot = {
    workoutStartedAtMs: snapshot.workoutStartedAtMs,
    exerciseName: snapshot.exerciseName,
    imageUrl: resolvedImage,
    nextSetSummary:
      snapshot.nextSetSummary !== undefined
        ? snapshot.nextSetSummary
        : lastSentSnapshot?.nextSetSummary ?? null,
    isResting: isPaused ? false : isResting,
    restEndAtMs: isPaused ? null : restEndAtMs,
    restSecondsDefault:
      snapshot.restSecondsDefault !== undefined
        ? snapshot.restSecondsDefault
        : lastSentSnapshot?.restSecondsDefault ?? null,
    progress:
      snapshot.progress !== undefined
        ? snapshot.progress
        : lastSentSnapshot?.progress ?? null,
    isPaused,
    pausedElapsedSeconds,
  };

  if (snapshotsEqual(lastSentSnapshot, full)) {
    return;
  }

  try {
    await updateQueue.enqueue(full, async (toSend, stillCurrent) => {
      // Resolve image at send time so coalesced jobs still skip re-decode.
      const imageForNative =
        lastSentSnapshot &&
        (lastSentSnapshot.imageUrl ?? null) === (toSend.imageUrl ?? null)
          ? null
          : toSend.imageUrl;

      let result: boolean | void | undefined = false;
      if (typeof module.updateWorkoutLive === "function") {
        result = await module.updateWorkoutLive(
          ...snapshotToArgs({
            ...toSend,
            imageUrl: imageForNative,
          })
        );
      } else if (toSend.isResting && toSend.restEndAtMs) {
        await module.updateRestTimer(
          toSend.restEndAtMs,
          toSend.exerciseName,
          toLiveActivityImageUrl(imageForNative),
          toSend.nextSetSummary
        );
        result = true;
      } else {
        return false;
      }

      if (result === false) {
        return false;
      }

      if (!stillCurrent()) {
        // Island note (or invalidate) won while this RPC was in flight. The stale
        // activity.update may already have landed — re-assert the authoritative
        // cache when nothing newer is queued. Bypass snapshotsEqual via a direct
        // queued native write (cache already holds the Island end).
        const authoritative = lastSentSnapshot;
        if (
          authoritative &&
          !updateQueue.hasPending() &&
          !snapshotsEqual(authoritative, toSend) &&
          typeof module.updateWorkoutLive === "function"
        ) {
          void updateQueue.enqueue(authoritative, async (snap, still) => {
            if (!still()) return false;
            const nativeResult = await module.updateWorkoutLive(
              ...snapshotToArgs({
                ...snap,
                imageUrl: null,
              })
            );
            return nativeResult !== false;
          });
        }
        return false;
      }

      // Commit only while this job is still latest (Island note may have won).
      lastSentSnapshot = toSend;
      return true;
    });
  } catch (e) {
    console.warn("[WorkoutLive] updateWorkoutLive failed", e);
  }
};

export const endWorkoutLive = async (): Promise<void> => {
  const module = getModule();
  unlockWorkoutLiveWrites();
  updateQueue.invalidate();
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

/**
 * Clear rest mode on the Live Activity / notification but keep the workout
 * session active. Prefer this over updateWorkoutLive({ restEndAtMs: null })
 * when skipping rest (Omitir) so native can use the dedicated clearRest path.
 */
export const clearWorkoutRestLive = async (): Promise<void> => {
  const module = getModule();
  if (!module) return;
  if (!shouldAcceptWorkoutLiveClearRest(writeGate)) {
    return;
  }
  updateQueue.invalidate();
  try {
    if (typeof module.clearRestLive === "function") {
      await module.clearRestLive();
      noteWorkoutLiveRestEnd(null);
      return;
    }
    if (lastSentSnapshot) {
      await updateWorkoutLive({
        workoutStartedAtMs: lastSentSnapshot.workoutStartedAtMs,
        exerciseName: lastSentSnapshot.exerciseName,
        imageUrl: lastSentSnapshot.imageUrl,
        nextSetSummary: lastSentSnapshot.nextSetSummary,
        isResting: false,
        restEndAtMs: null,
        restSecondsDefault: lastSentSnapshot.restSecondsDefault,
      });
      return;
    }
    if (typeof module.endRestTimer === "function") {
      // Legacy Android: may cancel the whole notification.
      await module.endRestTimer();
      lastSentSnapshot = null;
    }
  } catch (e) {
    console.warn("[WorkoutLive] clearWorkoutRestLive failed", e);
  }
};

/** @deprecated Prefer clearWorkoutRestLive for skip-rest; endWorkoutLive when finishing workout */
export const endRestTimerLive = clearWorkoutRestLive;

export const getCurrentRestTimerLiveState =
  async (): Promise<RestTimerLiveState | null> => {
    if (Platform.OS !== "ios") return null;
    const liveActivity = getIOSLiveActivity();
    try {
      if (typeof liveActivity?.getCurrentWorkoutLiveState === "function") {
        return (await liveActivity.getCurrentWorkoutLiveState()) as RestTimerLiveState;
      }
      if (typeof liveActivity?.getCurrentRestTimerState === "function") {
        return (await liveActivity.getCurrentRestTimerState()) as RestTimerLiveState;
      }
      return null;
    } catch (e) {
      console.warn("[WorkoutLive] getCurrentState failed", e);
      return null;
    }
  };

export const consumeAppTerminatedAt = async (): Promise<number | null> => {
  const intentModule = getIOSIntentModule();
  if (Platform.OS !== "ios" || !intentModule?.consumeAppTerminatedAt) {
    return null;
  }
  try {
    const value = await intentModule.consumeAppTerminatedAt();
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  } catch (e) {
    console.warn("[WorkoutLive] consumeAppTerminatedAt failed", e);
    return null;
  }
};

export const consumePendingCompleteSet = async (): Promise<boolean> => {
  const intentModule = getIOSIntentModule();
  if (Platform.OS !== "ios" || !intentModule?.consumePendingCompleteSet) {
    return false;
  }
  try {
    return Boolean(await intentModule.consumePendingCompleteSet());
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
