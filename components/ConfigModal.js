import React, { useState } from 'react';
import { StyleSheet, Text, View, Modal, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SLOTS } from '../constants/theme';
import { DEFAULT_SLOT_TIME_WINDOWS } from '../utils/mySugrImport';

const CORE_SLOT_NAMES = SLOTS.filter((s) => s.name !== 'Custom').map((s) => s.name);
const HHMM_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

export default function ConfigModal({ visible, config, onClose, onSaveConfig, onSendTestNotification, onCheckRemindersNow }) {
  const [lastAppointment, setLastAppointment] = useState(config.lastDoctorAppointment || '');
  const [missingDays, setMissingDays] = useState(config.missingSlotDaysThreshold || '20');
  const [sixReportsDays, setSixReportsDays] = useState(config.sixReportsReminderDays || '14');
  const [slotWindows, setSlotWindows] = useState({
    ...DEFAULT_SLOT_TIME_WINDOWS,
    ...(config.slotTimeWindows || {}),
  });

  const updateSlotWindow = (slotName, field, value) => {
    setSlotWindows((prev) => ({ ...prev, [slotName]: { ...prev[slotName], [field]: value } }));
  };

  const handleSave = () => {
    const sanitizedWindows = {};
    CORE_SLOT_NAMES.forEach((slotName) => {
      const win = slotWindows[slotName] || {};
      sanitizedWindows[slotName] = {
        start: HHMM_RE.test(win.start) ? win.start : DEFAULT_SLOT_TIME_WINDOWS[slotName].start,
        end: HHMM_RE.test(win.end) ? win.end : DEFAULT_SLOT_TIME_WINDOWS[slotName].end,
      };
    });

    onSaveConfig({
      lastDoctorAppointment: lastAppointment.trim(),
      missingSlotDaysThreshold: missingDays.trim() || '20',
      sixReportsReminderDays: sixReportsDays.trim() || '14',
      slotTimeWindows: sanitizedWindows,
    });
    onClose();
    Alert.alert('Settings Saved', 'Notification reminders updated successfully.');
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.headerRow}>
            <Text style={styles.modalTitle}>App Configuration</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>

          <Text style={styles.fieldLabel}>Last Doctor Appointment Date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={lastAppointment}
            placeholder="e.g. 2026-06-01"
            onChangeText={setLastAppointment}
          />
          <Text style={styles.helperText}>Reminder triggers automatically at 2.5 months (15 days prior to 3-month cycle).</Text>

          <Text style={styles.fieldLabel}>Missing Log Warning (Days)</Text>
          <TextInput
            style={styles.input}
            value={missingDays}
            keyboardType="numeric"
            placeholder="20"
            onChangeText={setMissingDays}
          />
          <Text style={styles.helperText}>Notify if a slot (e.g. Fasting) hasn't been logged in X days.</Text>

          <Text style={styles.fieldLabel}>6-Report Full Check Reminder (Every X Days)</Text>
          <TextInput
            style={styles.input}
            value={sixReportsDays}
            keyboardType="numeric"
            placeholder="14"
            onChangeText={setSixReportsDays}
          />

          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>Slot Time Windows (used to guess a slot when importing)</Text>
          {CORE_SLOT_NAMES.map((slotName) => (
            <View key={slotName} style={styles.slotWindowRow}>
              <Text style={styles.slotWindowLabel}>{slotName}</Text>
              <TextInput
                style={styles.slotTimeInput}
                value={slotWindows[slotName]?.start || ''}
                placeholder="07:00"
                onChangeText={(v) => updateSlotWindow(slotName, 'start', v)}
              />
              <Text style={styles.slotWindowDash}>–</Text>
              <TextInput
                style={styles.slotTimeInput}
                value={slotWindows[slotName]?.end || ''}
                placeholder="10:00"
                onChangeText={(v) => updateSlotWindow(slotName, 'end', v)}
              />
            </View>
          ))}
          <Text style={styles.helperText}>
            24-hour HH:MM. An end time earlier than the start wraps past midnight (e.g. 23:00 – 00:30).
          </Text>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save Settings</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>Debug Notifications</Text>
          <TouchableOpacity style={styles.debugBtn} onPress={onSendTestNotification}>
            <Text style={styles.debugBtnText}>Send Test Notification</Text>
          </TouchableOpacity>
          <Text style={styles.helperText}>Confirms whether notifications work on this device at all.</Text>

          <TouchableOpacity style={styles.debugBtn} onPress={onCheckRemindersNow}>
            <Text style={styles.debugBtnText}>Check Reminders Now</Text>
          </TouchableOpacity>
          <Text style={styles.helperText}>Re-runs the reminder checks immediately and tells you what it found.</Text>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 350, maxHeight: '86%', backgroundColor: '#FBF9F4', borderRadius: 24, padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#14201C' },
  closeText: { fontSize: 18, fontWeight: '700', color: '#8B9A94' },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#8B9A94', textTransform: 'uppercase', marginTop: 12, marginBottom: 4 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(20,32,28,0.12)', borderRadius: 12, padding: 10, fontSize: 14, fontWeight: '600', color: '#14201C' },
  helperText: { fontSize: 10.5, color: '#8B9A94', marginTop: 2, marginBottom: 4 },
  saveBtn: { backgroundColor: '#0D6E5E', height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  saveBtnText: { color: '#EAF6F2', fontWeight: '700', fontSize: 14 },
  divider: { height: 1, backgroundColor: 'rgba(20,32,28,0.09)', marginTop: 18, marginBottom: 4 },
  debugBtn: { backgroundColor: '#F0EDE5', height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  debugBtnText: { color: '#3D4C47', fontWeight: '700', fontSize: 13 },
  slotWindowRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  slotWindowLabel: { flex: 1, fontSize: 12, fontWeight: '600', color: '#3D4C47' },
  slotTimeInput: { width: 64, backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(20,32,28,0.12)', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8, fontSize: 12.5, fontWeight: '600', color: '#14201C', textAlign: 'center' },
  slotWindowDash: { fontSize: 12, color: '#8B9A94' },
});