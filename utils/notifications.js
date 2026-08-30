import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export const CONFIG_STORAGE_KEY = '@my_logs_app_config_v1';

export const DEFAULT_CONFIG = {
  lastDoctorAppointment: '',
  missingSlotDaysThreshold: '20',
  sixReportsReminderDays: '14',
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Requests OS notification permission and sets up the Android channel.
// Call once at app startup.
export const setupNotifications = async () => {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Reminders',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    await Notifications.requestPermissionsAsync();
  } catch (err) {
    console.warn('Notification setup warning:', err);
  }
};

const CORE_SLOTS = ['Fasting', 'Before Lunch', 'After Lunch 2hr', 'Before Dinner', 'After Dinner', '3 AM'];

const presentNotification = async (title, body) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      // A plain `null` trigger fires immediately but on Android lands on whichever
      // channel the OS improvises; pairing it with our channel id keeps it on the
      // HIGH-importance "reminders" channel set up in setupNotifications().
      trigger: Platform.OS === 'android' ? { channelId: 'reminders' } : null,
    });
  } catch (err) {
    console.warn('Notification error:', err);
  }
};

// Checks reminder conditions and posts a native notification (phone's notification panel) when due
export const checkReminders = async (entries = [], config = DEFAULT_CONFIG) => {
  if (!entries || !config) return;

  // 1. Doctor Appointment Check (at 2.5 months / 75 days)
  if (config.lastDoctorAppointment) {
    const lastDate = new Date(config.lastDoctorAppointment);
    if (!isNaN(lastDate.getTime())) {
      const diffDays = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 86400));
      if (diffDays >= 75) {
        await presentNotification(
          '🩺 Doctor Appointment Reminder',
          `It has been ${diffDays} days since your last appointment (${config.lastDoctorAppointment}). Please schedule your next visit.`
        );
        return;
      }
    }
  }

  if (entries.length === 0) return;

  // 2. Missing slot check (e.g. Fasting missing for X days)
  const thresholdDays = parseInt(config.missingSlotDaysThreshold, 10) || 20;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - thresholdDays);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const missingSlot = CORE_SLOTS.find(
    (slotName) => !entries.some((e) => e.slot === slotName && e.date >= cutoffStr && !e.hidden)
  );
  if (missingSlot) {
    await presentNotification(
      '⚠️ Missing Log Reminder',
      `You have not logged any "${missingSlot}" reading in the last ${thresholdDays} days.`
    );
    return;
  }

  // 3. Six-report full-day check reminder (all 6 core slots logged on the same day)
  const sixReportsDays = parseInt(config.sixReportsReminderDays, 10) || 14;
  const slotsLoggedByDate = {};
  entries.forEach((e) => {
    if (e.hidden || !CORE_SLOTS.includes(e.slot)) return;
    if (!slotsLoggedByDate[e.date]) slotsLoggedByDate[e.date] = new Set();
    slotsLoggedByDate[e.date].add(e.slot);
  });
  const lastCompleteDate = Object.keys(slotsLoggedByDate)
    .filter((date) => CORE_SLOTS.every((slot) => slotsLoggedByDate[date].has(slot)))
    .sort()
    .pop();

  const daysSinceComplete = lastCompleteDate
    ? Math.floor((Date.now() - new Date(lastCompleteDate).getTime()) / (1000 * 86400))
    : Infinity;

  if (daysSinceComplete >= sixReportsDays) {
    await presentNotification(
      '📋 Full 6-Point Check Reminder',
      lastCompleteDate
        ? `It has been ${daysSinceComplete} days since your last complete 6-point check (${lastCompleteDate}). Try logging a full day soon.`
        : `You haven't completed a full 6-point check yet. Try logging Fasting, Before Lunch, After Lunch, Before Dinner, After Dinner, and 3 AM all on the same day.`
    );
  }
};