import * as Haptics from "expo-haptics";

let lastPlayedAt = 0;

/**
 * In-app haptic when rest ends. Audio comes from the OS notification
 * (`sound: "default"` in notificationService) — device system sound.
 */
export async function playRestCompleteFeedback(): Promise<void> {
  const now = Date.now();
  if (now - lastPlayedAt < 1500) {
    return;
  }
  lastPlayedAt = now;

  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // Haptics may fail on simulator / restricted devices.
  }
}

export function isRestCompleteNotification(
  data: Record<string, unknown> | undefined | null
): boolean {
  return data?.type === "rest-complete";
}
