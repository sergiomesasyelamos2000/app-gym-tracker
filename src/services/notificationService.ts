import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { AppState, AppStateStatus, Linking, Platform } from "react-native";

// Track app state globally
let currentAppState: AppStateStatus = AppState.currentState;

// Listen to app state changes
AppState.addEventListener("change", (nextAppState) => {
  currentAppState = nextAppState;
});

// Configure notification behavior dynamically based on app state
Notifications.setNotificationHandler({
  handleNotification: async () => {
    const isAppInForeground = currentAppState === "active";

    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      // For user friendliness, we generally want to show the notification even in foreground
      // especially for timers.
      shouldShowList: !isAppInForeground,
    };
  },
});

export interface RestTimerNotification {
  notificationId: string;
  totalSeconds: number;
  exerciseName?: string;
}

class NotificationService {
  private activeTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private notificationIds: Map<string, string> = new Map();
  private autoDismissTimers: Map<string, ReturnType<typeof setTimeout>> =
    new Map();

  /**
   * Request notification permissions with better handling
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Only ask if permissions have not already been determined, because
      // iOS won't necessarily prompt the user a second time.
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        return false;
      }

      // Initialize Android Channel
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("rest-timer", {
          name: "Temporizador de Descanso",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          sound: "default", // Changed from missing custom sound to default
          enableVibrate: true,
          showBadge: true,
          lockscreenVisibility:
            Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: false,
        });

        // Channel for reminders
        await Notifications.setNotificationChannelAsync("reminders", {
          name: "Recordatorios",
          importance: Notifications.AndroidImportance.HIGH,
          sound: "default",
          enableVibrate: true,
          showBadge: true,
          lockscreenVisibility:
            Notifications.AndroidNotificationVisibility.PUBLIC,
        });
      }

      return true;
    } catch (error) {
      console.error("Error asking for permissions:", error);
      return false;
    }
  }

  /**
   * Start rest timer with notification
   */
  async startRestTimer(
    restSeconds: number,
    exerciseName?: string
  ): Promise<string | null> {
    try {
      // Ensure permissions before scheduling
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        // If critical feature, consider alerting user to enable permissions in settings
        return null;
      }

      // Cancel ALL existing rest timer notifications to prevent duplicates
      await this.cancelAllRestTimers();

      const timerId = `rest-timer-${Date.now()}`;
      const isAppInForeground = currentAppState === "active";

      // Schedule notification
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "✅ Descanso Completado!",
          body: exerciseName
            ? `Listo para la siguiente serie de ${exerciseName} 💪`
            : "Listo para la siguiente serie 💪",
          sound: "default", // Explicitly use default
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 250, 250, 250],
          ...(Platform.OS === "android" && {
            categoryIdentifier: "rest-complete",
            badge: 1,
            channelId: "rest-timer", // Use the created channel
          }),
          data: {
            type: "rest-complete",
            exerciseName,
            timerId,
            isAppInForeground,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: restSeconds,
          channelId: Platform.OS === "android" ? "rest-timer" : undefined,
          repeats: false,
        },
        identifier: timerId,
      });

      this.notificationIds.set(timerId, notificationId);

      // Auto-dismiss logic remains relevant for cleanup
      if (isAppInForeground) {
        const dismissTimer = setTimeout(async () => {
          try {
            await Notifications.dismissNotificationAsync(notificationId);
          } catch (e) {
            // Ignore dismissal errors
          }
          this.autoDismissTimers.delete(timerId);
        }, (restSeconds + 2) * 1000); // Dismiss 2 seconds after notification fires

        this.autoDismissTimers.set(timerId, dismissTimer);
      }

      return timerId;
    } catch (error) {
      console.error("Error scheduling rest timer notification:", error);
      return null;
    }
  }

  /**
   * Cancel a specific rest timer
   */
  async cancelRestTimer(timerId: string) {
    try {
      await Notifications.cancelScheduledNotificationAsync(timerId);
      this.notificationIds.delete(timerId);

      const dismissTimer = this.autoDismissTimers.get(timerId);
      if (dismissTimer) {
        clearTimeout(dismissTimer);
        this.autoDismissTimers.delete(timerId);
      }
    } catch (error) {
      console.error("Error canceling rest timer:", error);
    }
  }

  /**
   * Cancel all active rest timers
   */
  async cancelAllRestTimers() {
    try {
      const scheduledNotifications =
        await Notifications.getAllScheduledNotificationsAsync();

      for (const notification of scheduledNotifications) {
        if (notification.content.data?.type === "rest-complete") {
          await Notifications.cancelScheduledNotificationAsync(
            notification.identifier
          );
        }
      }

      this.autoDismissTimers.forEach((timer) => clearTimeout(timer));
      this.autoDismissTimers.clear();
      this.notificationIds.clear();
    } catch (error) {
      console.error("Error canceling all rest timers:", error);
    }
  }

  /**
   * Schedule a reminder notification with Date
   */
  async scheduleReminder(
    title: string,
    body: string,
    triggerDate: Date
  ): Promise<string | null> {
    try {
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) return null;

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: "default",
          priority: Notifications.AndroidNotificationPriority.HIGH,
          ...(Platform.OS === "android" && { channelId: "reminders" }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
          channelId: Platform.OS === "android" ? "reminders" : undefined,
        },
      });

      return notificationId;
    } catch (error) {
      console.error("Error scheduling reminder:", error);
      return null;
    }
  }

  /**
   * Schedule a reminder after X seconds
   */
  async scheduleReminderAfterSeconds(
    title: string,
    body: string,
    seconds: number,
    repeats: boolean = false
  ): Promise<string | null> {
    try {
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) return null;

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: "default",
          priority: Notifications.AndroidNotificationPriority.HIGH,
          ...(Platform.OS === "android" && { channelId: "reminders" }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds,
          repeats,
          channelId: Platform.OS === "android" ? "reminders" : undefined,
        },
      });

      return notificationId;
    } catch (error) {
      console.error("Error scheduling reminder:", error);
      return null;
    }
  }

  /**
   * Schedule a daily reminder at specific time
   */
  async scheduleDailyReminder(
    title: string,
    body: string,
    hour: number,
    minute: number = 0
  ): Promise<string | null> {
    try {
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) return null;

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: "default",
          priority: Notifications.AndroidNotificationPriority.HIGH,
          ...(Platform.OS === "android" && { channelId: "reminders" }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          channelId: Platform.OS === "android" ? "reminders" : undefined,
        },
      });

      return notificationId;
    } catch (error) {
      console.error("Error scheduling daily reminder:", error);
      return null;
    }
  }

  /**
   * Schedule a weekly reminder
   */
  async scheduleWeeklyReminder(
    title: string,
    body: string,
    weekday: number, // 1 = Sunday, 2 = Monday, ... 7 = Saturday
    hour: number,
    minute: number = 0
  ): Promise<string | null> {
    try {
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) return null;

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: "default",
          priority: Notifications.AndroidNotificationPriority.HIGH,
          ...(Platform.OS === "android" && { channelId: "reminders" }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour,
          minute,
          channelId: Platform.OS === "android" ? "reminders" : undefined,
        },
      });

      return notificationId;
    } catch (error) {
      console.error("Error scheduling weekly reminder:", error);
      return null;
    }
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId: string) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error("Error cancelling notification:", error);
    }
  }

  /**
   * Cancel all notifications
   */
  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.dismissAllNotificationsAsync();
    } catch (error) {
      console.error("Error cancelling all notifications:", error);
    }
  }

  /**
   * Register for push notifications and return the token
   */
  async registerForPushNotificationsAsync(): Promise<string | null> {
    if (Platform.OS === "web") {
      return null;
    }

    const hasPermissions = await this.requestPermissions();
    if (!hasPermissions) {
      return null;
    }

    try {
      // Check for EAS Project ID using expo-constants
      // This prevents the error: [Error: No "projectId" found...]
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;

      if (!projectId) {
        return null;
      }

      // Get the token explicitly passing the projectId if available
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      const token = tokenData.data;
      return token;
    } catch (error) {
      // Gracefully handle the error if it still occurs
      console.error("Error getting push token:", error);
      return null;
    }
  }

  /**
   * Open system settings for permissions
   */
  openSettings() {
    if (Platform.OS === "ios") {
      Linking.openURL("app-settings:");
    } else {
      Linking.openSettings();
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

// Export for convenience
export const {
  requestPermissions,
  registerForPushNotificationsAsync,
  startRestTimer,
  cancelRestTimer,
  cancelAllRestTimers,
  scheduleReminder,
  scheduleReminderAfterSeconds,
  scheduleDailyReminder,
  scheduleWeeklyReminder,
  cancelNotification,
  cancelAllNotifications,
} = notificationService;
