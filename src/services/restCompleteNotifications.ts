export const REST_COMPLETE_TYPE = "rest-complete";

export function isRestCompleteData(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  return (data as { type?: unknown }).type === REST_COMPLETE_TYPE;
}

type ScheduledLike = {
  identifier?: string | null;
  content?: { data?: unknown } | null;
};

type PresentedLike = {
  request?: {
    identifier?: string | null;
    content?: { data?: unknown } | null;
  } | null;
};

/** Unique identifiers of scheduled rest-complete notifications. */
export function scheduledRestCompleteIds(
  scheduled: ScheduledLike[] | null | undefined
): string[] {
  if (!scheduled?.length) return [];
  const ids = new Set<string>();
  for (const item of scheduled) {
    if (!isRestCompleteData(item.content?.data)) continue;
    const id = item.identifier;
    if (typeof id === "string" && id.length > 0) {
      ids.add(id);
    }
  }
  return [...ids];
}

/** Unique identifiers of presented (tray) rest-complete notifications. */
export function presentedRestCompleteIds(
  presented: PresentedLike[] | null | undefined
): string[] {
  if (!presented?.length) return [];
  const ids = new Set<string>();
  for (const item of presented) {
    if (!isRestCompleteData(item.request?.content?.data)) continue;
    const id = item.request?.identifier;
    if (typeof id === "string" && id.length > 0) {
      ids.add(id);
    }
  }
  return [...ids];
}
