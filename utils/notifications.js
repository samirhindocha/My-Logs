import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const CONFIG_STORAGE_KEY = '@my_logs_app_config_v1';

export const DEFAULT_CONFIG = {
  lastDoctorAppointment: '', // YYYY-MM-DD
  missingSlotDaysThreshold: '20',
  sixReportsReminderDays: '14',
};

export const requestNotificationPermission = async () => {
  if (Platform.OS === 'web') return false;
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === 'granted';
};

export const scheduleAllReminders = async (entries = [], config = DEFAULT_CONFIG) => {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();

  // 1. Dr. Appointment notification (at 2.5 months / ~75 days, which is 15 days before 3 months)
  if (config.lastDoctorAppointment) {
    const lastDate = new Date(config.lastDoctorAppointment);
    if (!isNaN(lastDate.getTime())) {
      const notifyDate = new Date(lastDate);
      notifyDate.setDate(notifyDate.getDate() + 75); // 2.5 months
      const secondsUntil = Math.floor((notifyDate.getTime() - Date.now()) / 1000);

      if (secondsUntil > 0) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🩺 Doctor Appointment Due Soon',
            body: 'It has been 2.5 months since your last visit. Please book your doctor appointment for next week.',
          },
          trigger: { seconds: secondsUntil },
        });
      }
    }
  }

  // 2. Missing slot check (e.g. No Fasting test in last x days)
  const thresholdDays = parseInt(config.missingSlotDaysThreshold, 10) || 20;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - thresholdDays);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const coreSlots = ['Fasting', 'Before Lunch', 'After Lunch 2hr', 'Before Dinner', 'After Dinner', '3 AM'];
  coreSlots.forEach((slotName) => {
    const hasLog = entries.some((e) => e.slot === slotName && e.date >= cutoffStr && !e.hidden);
    if (!hasLog && entries.length > 0) {
      Notifications.scheduleNotificationAsync({
        content: {
          title: `⚠️ Missing Log Alert: ${slotName}`,
          body: `No ${slotName} reading recorded in the last ${thresholdDays} days. Please take a reading today.`,
        },
        trigger: { seconds: 10 }, // Triggers prompt
      });
    }
  });

  // 3. Reminder every X days for completing full 6 reports a day
  const intervalDays = parseInt(config.sixReportsReminderDays, 10) || 14;
  if (intervalDays > 0) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📋 6-Point Profile Check Today',
        body: `Routine check: Please remember to log all 6 scheduled sugar reports today.`,
      },
      trigger: {
        seconds: intervalDays * 86400,
        repeats: true,
      },
    });
  }
};