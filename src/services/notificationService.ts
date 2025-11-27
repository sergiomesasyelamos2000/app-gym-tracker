import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface RestTimerNotification {
  notificationId: string;
  totalSeconds: number;
  exerciseName?: string;
}

class NotificationService {
  private activeTimers: Map<string, NodeJS.Timeout> = new Map();
  private notificationIds: Map<string, string> = new Map();

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        return false;
      }

      // For Android, create notification channel with MAX importance for lock screen
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("rest-timer", {
          name: "Temporizador de Descanso",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          sound: "default",
          enableVibrate: true,
          showBadge: true,
          lockscreenVisibility:
            Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: false,
        });
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Start rest timer with notification
   * Schedules a notification to fire when the rest time completes
   */
  async startRestTimer(
    restSeconds: number,
    exerciseName?: string
  ): Promise<string | null> {
    try {
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        return null;
      }

      // Cancel ALL existing rest timer notifications to prevent duplicates
      // This is safer than relying on a single ID
      await this.cancelAllRestTimers();

      const timerId = `rest-timer-${Date.now()}`;

      // Schedule notification to fire after restSeconds
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "✅ Descanso Completado!",
          body: exerciseName
            ? `Listo para la siguiente serie de ${exerciseName} 💪`
            : "Listo para la siguiente serie 💪",
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 250, 250, 250],
          // Android specific for lock screen
          ...(Platform.OS === "android" && {
            categoryIdentifier: "rest-complete",
            badge: 1,
          }),
          data: {
            type: "rest-complete",
            exerciseName,
            timerId,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: restSeconds,
          channelId: Platform.OS === "android" ? "rest-timer" : undefined,
          repeats: false, // Explicitly set repeats to false
        },
        identifier: timerId,
      });

      this.notificationIds.set(timerId, notificationId);

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
    } catch (error) {
      console.error("Error canceling rest timer:", error);
    }
  }

  /**
   * Cancel all active rest timers
   */
  async cancelAllRestTimers() {
    try {
      // Get all scheduled notifications
      const scheduledNotifications =
        await Notifications.getAllScheduledNotificationsAsync();

      // Cancel only rest timer notifications
      for (const notification of scheduledNotifications) {
        if (notification.content.data?.type === "rest-complete") {
          await Notifications.cancelScheduledNotificationAsync(
            notification.identifier
          );
        }
      }

      this.notificationIds.clear();
    } catch (error) {
      console.error("Error canceling all rest timers:", error);
    }
  }

  /**
   * Format seconds to MM:SS
   */
  private formatTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
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
      if (!hasPermissions) {
        return null;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE, // ✅ Agregar type
          date: triggerDate,
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
      if (!hasPermissions) {
        return null;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, // ✅ Agregar type
          seconds,
          repeats,
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
      if (!hasPermissions) {
        return null;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY, // ✅ Agregar type
          hour,
          minute,
          //repeats: true,
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
    weekday: number, // 1 = Monday, 7 = Sunday
    hour: number,
    minute: number = 0
  ): Promise<string | null> {
    try {
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        return null;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY, // ✅ Agregar type
          weekday,
          hour,
          minute,
          //repeats: true,
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
}

// Export singleton instance
export const notificationService = new NotificationService();

// Export for convenience
export const {
  requestPermissions,
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
