import { Alert } from 'react-native';

export const CONFIG_STORAGE_KEY = '@my_logs_app_config_v1';

export const DEFAULT_CONFIG = {
  lastDoctorAppointment: '',
  missingSlotDaysThreshold: '20',
  sixReportsReminderDays: '14',
};

// Pure in-app reminder checker (Zero native crash risk)
export const checkInAppReminders = (entries = [], config = DEFAULT_CONFIG) => {
  if (!entries || !config) return;

  // 1. Doctor Appointment Check (at 2.5 months / 75 days)
  if (config.lastDoctorAppointment) {
    const lastDate = new Date(config.lastDoctorAppointment);
    if (!isNaN(lastDate.getTime())) {
      const diffDays = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 86400));
      if (diffDays >= 75) {
        Alert.alert(
          '🩺 Doctor Appointment Reminder',
          `It has been ${diffDays} days since your last appointment (${config.lastDoctorAppointment}). Please schedule your next visit.`
        );
        return;
      }
    }
  }

  // 2. Missing slot check (e.g. Fasting missing for X days)
  const thresholdDays = parseInt(config.missingSlotDaysThreshold, 10) || 20;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - thresholdDays);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const coreSlots = ['Fasting', 'Before Lunch', 'After Lunch 2hr', 'Before Dinner', 'After Dinner', '3 AM'];
  for (const slotName of coreSlots) {
    const hasLog = entries.some((e) => e.slot === slotName && e.date >= cutoffStr && !e.hidden);
    if (!hasLog && entries.length > 0) {
      Alert.alert(
        '⚠️ Missing Log Reminder',
        `You have not logged any "${slotName}" reading in the last ${thresholdDays} days.`
      );
      break;
    }
  }
};