export type MediaCandidate =
  | { type: "video" | "gif"; uri: string; local: boolean }
  | { type: "static"; uri: string | null };

export type PickExerciseMediaInput = {
  isOnline: boolean | null;
  local: { video: string | null; gif: string | null; static: string | null };
  remote: { video: string | null; gif: string | null; static: string | null };
};

export type PickExerciseMediaResult =
  | { status: "pending" }
  | { status: "ready"; candidates: MediaCandidate[] };

/** Allow only http(s) or file URIs safe to embed in WebView HTML. */
export function escapeMediaUrl(uri: string): string | null {
  const trimmed = uri.trim();
  if (!trimmed) return null;
  if (trimmed.includes('"') || trimmed.includes("'") || trimmed.includes("<")) {
    return null;
  }
  if (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("file://")
  ) {
    return trimmed;
  }
  return null;
}

function pushLocalMotion(
  candidates: MediaCandidate[],
  local: PickExerciseMediaInput["local"]
): void {
  if (local.video) {
    candidates.push({ type: "video", uri: local.video, local: true });
  }
  if (local.gif) {
    candidates.push({ type: "gif", uri: local.gif, local: true });
  }
}

function pushOfflineStatic(
  candidates: MediaCandidate[],
  local: PickExerciseMediaInput["local"]
): void {
  if (local.static) {
    candidates.push({ type: "static", uri: local.static });
  }
  candidates.push({ type: "static", uri: null });
}

/**
 * Builds the ordered media fallback chain for exercise detail.
 * Offline: local video → local gif → local static → not-image.
 * Online: local video → remote video → local gif → remote gif →
 *         local static → remote static → not-image.
 * While connectivity is unknown (`null`): use locals only when present; otherwise pending.
 */
export function pickExerciseMediaSource(
  input: PickExerciseMediaInput
): PickExerciseMediaResult {
  const { isOnline, local, remote } = input;
  const hasLocal = Boolean(local.video || local.gif || local.static);

  if (isOnline === null) {
    if (!hasLocal) {
      return { status: "pending" };
    }
    const candidates: MediaCandidate[] = [];
    pushLocalMotion(candidates, local);
    pushOfflineStatic(candidates, local);
    return { status: "ready", candidates };
  }

  const candidates: MediaCandidate[] = [];

  if (isOnline) {
    if (local.video) {
      candidates.push({ type: "video", uri: local.video, local: true });
    }
    if (remote.video) {
      candidates.push({ type: "video", uri: remote.video, local: false });
    }
    if (local.gif) {
      candidates.push({ type: "gif", uri: local.gif, local: true });
    }
    if (remote.gif) {
      candidates.push({ type: "gif", uri: remote.gif, local: false });
    }
    if (local.static) {
      candidates.push({ type: "static", uri: local.static });
    }
    if (remote.static) {
      candidates.push({ type: "static", uri: remote.static });
    }
    candidates.push({ type: "static", uri: null });
    return { status: "ready", candidates };
  }

  // Offline
  pushLocalMotion(candidates, local);
  pushOfflineStatic(candidates, local);
  return { status: "ready", candidates };
}
