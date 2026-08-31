import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { DEFAULT_SLOT_TIME_WINDOWS } from './mySugrImport';

export const CONFIG_STORAGE_KEY = '@my_logs_app_config_v1';

export const DEFAULT_CONFIG = {
  lastDoctorAppointment: '',
  missingSlotDaysThreshold: '10',
  sixReportsReminderDays: '15',
  slotTimeWindows: DEFAULT_SLOT_TIME_WINDOWS,
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
// Call once at app startup. Returns whether permission is actually granted,
// since a silently-denied permission is the most common reason "nothing shows up".
export const setupNotifications = async () => {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Reminders',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (err) {
    console.warn('Notification setup warning:', err);
    return false;
  }
};

const CORE_SLOTS = ['Fasting', 'Before Lunch', 'After Lunch 2hr', 'Before Dinner', 'After Dinner', '3 AM'];

const presentNotification = async (title, body) => {
  const content = { title, body };
  try {
    // Pairing the trigger with our channel id keeps it on the HIGH-importance
    // "reminders" channel (set up in setupNotifications()) instead of whatever
    // channel Android would otherwise improvise for a plain `null` trigger.
    await Notifications.scheduleNotificationAsync({
      content,
      trigger: Platform.OS === 'android' ? { channelId: 'reminders' } : null,
    });
  } catch (err) {
    console.warn('Notification error (channel trigger), retrying without it:', err);
    try {
      await Notifications.scheduleNotificationAsync({ content, trigger: null });
    } catch (err2) {
      console.warn('Notification error (fallback):', err2);
    }
  }
};

// Fires an immediate notification with no conditions attached — use this to check
// whether notifications work on this device at all (permission, channel, build),
// separately from whether the reminder conditions themselves are true.
export const sendTestNotification = () =>
  presentNotification('🔔 Test Notification', 'If you see this, notifications are working correctly.');

// Checks reminder conditions and posts a native notification (phone's notification panel)
// when due. Always returns { fired, reason } describing what it found — silent auto-run
// call sites can ignore this, but it lets a manual "Check Now" button explain a no-op.
export const checkReminders = async (entries = [], config = DEFAULT_CONFIG) => {
  if (!entries || !config) return { fired: false, reason: 'No entries or config.' };

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
        return { fired: true, reason: 'Doctor appointment overdue.' };
      }
    }
  }

  if (entries.length === 0) return { fired: false, reason: 'No entries logged yet.' };

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
    return { fired: true, reason: `"${missingSlot}" missing for ${thresholdDays}+ days.` };
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
    return {
      fired: true,
      reason: lastCompleteDate
        ? `No complete 6-point day in ${daysSinceComplete}+ days (last: ${lastCompleteDate}).`
        : 'No complete 6-point day ever logged.',
    };
  }

  return {
    fired: false,
    reason: `All good: every core slot logged within ${thresholdDays} days, and a complete 6-point day within the last ${sixReportsDays} days${
      lastCompleteDate ? ` (last: ${lastCompleteDate}, ${daysSinceComplete}d ago)` : ''
    }.`,
  };
};