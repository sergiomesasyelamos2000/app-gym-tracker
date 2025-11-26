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

      // For Android, create notification channel
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("rest-timer", {
          name: "Temporizador de Descanso",
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          sound: "default",
          enableVibrate: true,
          showBadge: false,
        });
      }

      return true;
    } catch (error) {
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
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        return null;
      }

      await this.cancelAllRestTimers();

      const timerId = `rest-timer-${Date.now()}`;

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "⏱️ Tiempo de Descanso",
          body: exerciseName
            ? `${exerciseName} - ${this.formatTime(restSeconds)} restantes`
            : `${this.formatTime(restSeconds)} restantes`,
          sound: false,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          sticky: true,
          data: {
            type: "rest-timer",
            timerId,
            remainingSeconds: restSeconds,
            exerciseName,
          },
        },
        trigger: null,
        identifier: timerId,
      });

      this.notificationIds.set(timerId, notificationId);

      let remainingSeconds = restSeconds;
      const interval = setInterval(async () => {
        remainingSeconds--;

        if (remainingSeconds <= 0) {
          clearInterval(interval);
          this.activeTimers.delete(timerId);
          await this.onRestTimerComplete(timerId, exerciseName);
          return;
        }

        await Notifications.scheduleNotificationAsync({
          content: {
            title: "⏱️ Tiempo de Descanso",
            body: exerciseName
              ? `${exerciseName} - ${this.formatTime(
                  remainingSeconds
                )} restantes`
              : `${this.formatTime(remainingSeconds)} restantes`,
            sound: false,
            priority: Notifications.AndroidNotificationPriority.HIGH,
            sticky: true,
            data: {
              type: "rest-timer",
              timerId,
              remainingSeconds,
              exerciseName,
            },
          },
          trigger: null,
          identifier: timerId,
        });
      }, 1000);

      this.activeTimers.set(timerId, interval);

      return timerId;
    } catch (error) {
      return null;
    }
  }

  /**
   * Called when rest timer completes
   */
  private async onRestTimerComplete(timerId: string, exerciseName?: string) {
    try {
      await Notifications.dismissNotificationAsync(timerId);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "✅ Descanso Completado!",
          body: exerciseName
            ? `Listo para la siguiente serie de ${exerciseName}`
            : "Listo para la siguiente serie",
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          vibrate: [0, 250, 250, 250],
          data: {
            type: "rest-complete",
            exerciseName,
          },
        },
        trigger: null,
      });
    } catch (error) {}
  }

  /**
   * Cancel a specific rest timer
   */
  async cancelRestTimer(timerId: string) {
    try {
      const interval = this.activeTimers.get(timerId);
      if (interval) {
        clearInterval(interval);
        this.activeTimers.delete(timerId);
      }

      await Notifications.dismissNotificationAsync(timerId);
      await Notifications.cancelScheduledNotificationAsync(timerId);
      this.notificationIds.delete(timerId);
    } catch (error) {}
  }

  /**
   * Cancel all active rest timers
   */
  async cancelAllRestTimers() {
    try {
      for (const [timerId, interval] of this.activeTimers.entries()) {
        clearInterval(interval);
        await Notifications.dismissNotificationAsync(timerId);
        await Notifications.cancelScheduledNotificationAsync(timerId);
      }

      this.activeTimers.clear();
      this.notificationIds.clear();
    } catch (error) {}
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
