import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
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
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ Notification permissions not granted');
        return false;
      }

      // For Android, create notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('rest-timer', {
          name: 'Temporizador de Descanso',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          sound: 'default',
          enableVibrate: true,
          showBadge: false,
        });
      }

      console.log('✅ Notification permissions granted');
      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
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
      // Request permissions first
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        console.log('Cannot start rest timer: No notification permissions');
        return null;
      }

      // Cancel any existing timers
      await this.cancelAllRestTimers();

      const timerId = `rest-timer-${Date.now()}`;

      // Schedule initial notification showing rest timer
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏱️ Tiempo de Descanso',
          body: exerciseName
            ? `${exerciseName} - ${this.formatTime(restSeconds)} restantes`
            : `${this.formatTime(restSeconds)} restantes`,
          sound: false, // Don't play sound for ongoing timer
          priority: Notifications.AndroidNotificationPriority.HIGH,
          sticky: true, // Keep notification visible on Android
          data: {
            type: 'rest-timer',
            timerId,
            remainingSeconds: restSeconds,
            exerciseName,
          },
        },
        trigger: null, // Show immediately
        identifier: timerId,
      });

      this.notificationIds.set(timerId, notificationId);

      // Update notification every second
      let remainingSeconds = restSeconds;
      const interval = setInterval(async () => {
        remainingSeconds--;

        if (remainingSeconds <= 0) {
          clearInterval(interval);
          this.activeTimers.delete(timerId);
          await this.onRestTimerComplete(timerId, exerciseName);
          return;
        }

        // Update notification with new time
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '⏱️ Tiempo de Descanso',
            body: exerciseName
              ? `${exerciseName} - ${this.formatTime(remainingSeconds)} restantes`
              : `${this.formatTime(remainingSeconds)} restantes`,
            sound: false,
            priority: Notifications.AndroidNotificationPriority.HIGH,
            sticky: true,
            data: {
              type: 'rest-timer',
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

      console.log(`✅ Rest timer started: ${restSeconds}s${exerciseName ? ` for ${exerciseName}` : ''}`);
      return timerId;
    } catch (error) {
      console.error('Error starting rest timer:', error);
      return null;
    }
  }

  /**
   * Called when rest timer completes
   */
  private async onRestTimerComplete(timerId: string, exerciseName?: string) {
    try {
      // Cancel the ongoing notification
      await Notifications.dismissNotificationAsync(timerId);

      // Show completion notification with sound
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '✅ Descanso Completado!',
          body: exerciseName
            ? `Listo para la siguiente serie de ${exerciseName}`
            : 'Listo para la siguiente serie',
          sound: true, // Play sound for completion
          priority: Notifications.AndroidNotificationPriority.HIGH,
          vibrate: [0, 250, 250, 250],
          data: {
            type: 'rest-complete',
            exerciseName,
          },
        },
        trigger: null,
      });

      console.log('✅ Rest timer completed');
    } catch (error) {
      console.error('Error completing rest timer:', error);
    }
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

      console.log(`✅ Rest timer cancelled: ${timerId}`);
    } catch (error) {
      console.error('Error cancelling rest timer:', error);
    }
  }

  /**
   * Cancel all active rest timers
   */
  async cancelAllRestTimers() {
    try {
      // Clear all intervals
      for (const [timerId, interval] of this.activeTimers.entries()) {
        clearInterval(interval);
        await Notifications.dismissNotificationAsync(timerId);
        await Notifications.cancelScheduledNotificationAsync(timerId);
      }

      this.activeTimers.clear();
      this.notificationIds.clear();

      console.log('✅ All rest timers cancelled');
    } catch (error) {
      console.error('Error cancelling all rest timers:', error);
    }
  }

  /**
   * Add time to active rest timer
   */
  async addTimeToRestTimer(timerId: string, secondsToAdd: number) {
    const interval = this.activeTimers.get(timerId);
    if (!interval) {
      console.log('No active timer found to add time to');
      return;
    }

    // This is simplified - in production you'd need to track current time and restart
    console.log(`Adding ${secondsToAdd}s to timer ${timerId}`);
    // Implementation would require tracking current remaining time
  }

  /**
   * Format seconds to MM:SS
   */
  private formatTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Schedule a reminder notification
   */
  async scheduleReminder(title: string, body: string, trigger: Date) {
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
        trigger,
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling reminder:', error);
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
      console.error('Error cancelling notification:', error);
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
      console.error('Error cancelling all notifications:', error);
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
  cancelNotification,
  cancelAllNotifications,
} = notificationService;
