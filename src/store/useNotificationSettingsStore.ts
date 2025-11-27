import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Notification Settings Store
 *
 * Manages user preferences for notifications including:
 * - Rest timer notifications
 * - Workout reminders
 * - General notification settings
 */

interface NotificationSettings {
  // Rest timer notifications
  restTimerNotificationsEnabled: boolean;

  // Workout reminders
  workoutRemindersEnabled: boolean;
  workoutReminderTime: { hour: number; minute: number } | null;
  workoutReminderDays: number[]; // 1-7 for Monday-Sunday

  // General settings
  notificationSoundEnabled: boolean;
  notificationVibrationEnabled: boolean;

  // Permission status
  permissionsGranted: boolean;
}

interface NotificationSettingsActions {
  // Rest timer
  toggleRestTimerNotifications: () => void;
  setRestTimerNotifications: (enabled: boolean) => void;

  // Workout reminders
  toggleWorkoutReminders: () => void;
  setWorkoutReminders: (enabled: boolean) => void;
  setWorkoutReminderTime: (hour: number, minute: number) => void;
  setWorkoutReminderDays: (days: number[]) => void;

  // General
  toggleNotificationSound: () => void;
  toggleNotificationVibration: () => void;

  // Permissions
  setPermissionsGranted: (granted: boolean) => void;

  // Reset
  resetSettings: () => void;
}

type NotificationSettingsStore = NotificationSettings &
  NotificationSettingsActions;

const defaultSettings: NotificationSettings = {
  restTimerNotificationsEnabled: true,
  workoutRemindersEnabled: false,
  workoutReminderTime: null,
  workoutReminderDays: [1, 3, 5], // Monday, Wednesday, Friday by default
  notificationSoundEnabled: true,
  notificationVibrationEnabled: true,
  permissionsGranted: false,
};

export const useNotificationSettingsStore = create<NotificationSettingsStore>()(
  persist(
    (set, get) => ({
      ...defaultSettings,

      // Rest timer notifications
      toggleRestTimerNotifications: () =>
        set((state) => ({
          restTimerNotificationsEnabled: !state.restTimerNotificationsEnabled,
        })),

      setRestTimerNotifications: (enabled: boolean) =>
        set({ restTimerNotificationsEnabled: enabled }),

      // Workout reminders
      toggleWorkoutReminders: () =>
        set((state) => ({
          workoutRemindersEnabled: !state.workoutRemindersEnabled,
        })),

      setWorkoutReminders: (enabled: boolean) =>
        set({ workoutRemindersEnabled: enabled }),

      setWorkoutReminderTime: (hour: number, minute: number) =>
        set({ workoutReminderTime: { hour, minute } }),

      setWorkoutReminderDays: (days: number[]) =>
        set({ workoutReminderDays: days }),

      // General settings
      toggleNotificationSound: () =>
        set((state) => ({
          notificationSoundEnabled: !state.notificationSoundEnabled,
        })),

      toggleNotificationVibration: () =>
        set((state) => ({
          notificationVibrationEnabled: !state.notificationVibrationEnabled,
        })),

      // Permissions
      setPermissionsGranted: (granted: boolean) =>
        set({ permissionsGranted: granted }),

      // Reset
      resetSettings: () => set(defaultSettings),
    }),
    {
      name: "notification-settings-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        restTimerNotificationsEnabled: state.restTimerNotificationsEnabled,
        workoutRemindersEnabled: state.workoutRemindersEnabled,
        workoutReminderTime: state.workoutReminderTime,
        workoutReminderDays: state.workoutReminderDays,
        notificationSoundEnabled: state.notificationSoundEnabled,
        notificationVibrationEnabled: state.notificationVibrationEnabled,
        permissionsGranted: state.permissionsGranted,
      }),
    }
  )
);
