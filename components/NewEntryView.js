import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SLOTS } from '../constants/theme';
import { formatDateDisplay, getReadingStatus } from '../utils/storage';

export default function NewEntryView({ onSave, onCancel }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState('Fasting');
  const [customLabel, setCustomLabel] = useState('');
  const [customTime, setCustomTime] = useState('10:30');

  // Input states controlled via custom keypad
  const [focusField, setFocusField] = useState('reading'); // 'reading' | 'am' | 'pm'
  const [reading, setReading] = useState('');
  const [amUnits, setAmUnits] = useState('');
  const [pmUnits, setPmUnits] = useState('');

  // Jump to Date Modal state
  const [isJumpModalOpen, setIsJumpModalOpen] = useState(false);
  const [jumpDateInput, setJumpDateInput] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Date Shift Helpers
  const shiftDay = (days) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + days);
    setSelectedDate(next);
  };

  const handleJumpDateConfirm = () => {
    const parsed = new Date(jumpDateInput);
    if (isNaN(parsed.getTime())) {
      Alert.alert('Invalid Date', 'Please enter a valid date in YYYY-MM-DD format.');
      return;
    }
    setSelectedDate(parsed);
    setIsJumpModalOpen(false);
  };

  // On-screen Keypad Handler
  const handleKeyPress = (key) => {
    let currentVal =
      focusField === 'reading' ? reading : focusField === 'am' ? amUnits : pmUnits;

    let nextVal = currentVal;
    if (key === 'del') {
      nextVal = currentVal.slice(0, -1);
    } else if (key === '00') {
      if (currentVal.length > 0 && currentVal.length <= 3) nextVal = currentVal + '00';
    } else {
      if (currentVal.length < (focusField === 'reading' ? 4 : 2)) {
        nextVal = currentVal === '0' ? key : currentVal + key;
      }
    }

    if (focusField === 'reading') setReading(nextVal);
    else if (focusField === 'am') setAmUnits(nextVal);
    else setPmUnits(nextVal);
  };

  const status = getReadingStatus(reading);
  const canSave = reading.length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const slotDef = SLOTS.find((s) => s.name === selectedSlot);
    onSave({
      id: Date.now().toString(),
      date: selectedDate.toISOString().split('T')[0],
      slot: selectedSlot === 'Custom' ? customLabel || 'Custom' : selectedSlot,
      time: selectedSlot === 'Custom' ? customTime : slotDef?.time,
      reading: parseFloat(reading),
      am: amUnits,
      pm: pmUnits,
    });
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={onCancel}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New reading</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Date Selector with Jump Option */}
        <View style={styles.dateCard}>
          <TouchableOpacity style={styles.arrowBtn} onPress={() => shiftDay(-1)}>
            <Text style={styles.arrowText}>‹</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dateCenter}
            onPress={() => {
              setJumpDateInput(selectedDate.toISOString().split('T')[0]);
              setIsJumpModalOpen(true);
            }}
          >
            <Text style={styles.sectionCaption}>DATE (TAP TO JUMP)</Text>
            <Text style={styles.dateText}>{formatDateDisplay(selectedDate)}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.arrowBtn} onPress={() => shiftDay(1)}>
            <Text style={styles.arrowText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Time Slots Grid */}
        <Text style={styles.sectionHeader}>TIME</Text>
        <View style={styles.slotsGrid}>
          {SLOTS.map((slot) => {
            const isSelected = selectedSlot === slot.name;
            return (
              <TouchableOpacity
                key={slot.name}
                style={[styles.slotChip, isSelected && styles.slotChipActive]}
                onPress={() => setSelectedSlot(slot.name)}
              >
                <Text style={[styles.slotName, isSelected && styles.slotNameActive]}>
                  {slot.name}
                </Text>
                <Text style={[styles.slotTime, isSelected && styles.slotTimeActive]}>
                  {slot.name === 'Custom' && isSelected ? customTime : slot.time}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Custom Slot Sub-fields */}
        {selectedSlot === 'Custom' && (
          <View style={styles.customContainer}>
            <Text style={styles.sectionCaption}>LABEL THIS READING</Text>
            <TextInput
              style={styles.customInput}
              placeholder="e.g. After a walk"
              value={customLabel}
              onChangeText={setCustomLabel}
            />
            <View style={styles.customTimeRow}>
              <Text style={styles.customTimeLabel}>Time</Text>
              <TextInput
                style={styles.customTimeInput}
                value={customTime}
                onChangeText={setCustomTime}
                placeholder="10:30"
              />
            </View>
          </View>
        )}

        {/* Reading Card */}
        <Text style={styles.sectionHeader}>READING</Text>
        <TouchableOpacity
          style={[
            styles.readingCard,
            focusField === 'reading' && styles.activeCardBorder,
          ]}
          onPress={() => setFocusField('reading')}
        >
          <View style={styles.readingValRow}>
            <Text style={[styles.readingValue, !reading && styles.placeholderValue]}>
              {reading || '––'}
            </Text>
            <Text style={styles.readingUnit}>mg/dL</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.text}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Insulin Units */}
        <Text style={styles.sectionHeader}>INSULIN UNITS</Text>
        <View style={styles.insulinGrid}>
          <TouchableOpacity
            style={[
              styles.doseCard,
              focusField === 'am' && styles.activeCardBorder,
            ]}
            onPress={() => setFocusField('am')}
          >
            <View style={styles.doseHeader}>
              <View style={[styles.doseDot, { backgroundColor: '#E0A422' }]} />
              <Text style={styles.doseLabel}>Morning</Text>
            </View>
            <View style={styles.doseValRow}>
              <Text style={[styles.doseValue, !amUnits && styles.placeholderValue]}>
                {amUnits || '––'}
              </Text>
              <Text style={styles.doseUnit}>u</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.doseCard,
              focusField === 'pm' && styles.activeCardBorder,
            ]}
            onPress={() => setFocusField('pm')}
          >
            <View style={styles.doseHeader}>
              <View style={[styles.doseDot, { backgroundColor: '#5B6BC0' }]} />
              <Text style={styles.doseLabel}>Evening</Text>
            </View>
            <View style={styles.doseValRow}>
              <Text style={[styles.doseValue, !pmUnits && styles.placeholderValue]}>
                {pmUnits || '––'}
              </Text>
              <Text style={styles.doseUnit}>u</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.helperText}>
          Tap a field, then use the keypad. Leave a dose empty if you skipped it.
        </Text>
      </ScrollView>

      {/* Embedded Material 3 Numeric Keypad */}
      <View style={styles.keypadWrapper}>
        <View style={styles.keypadIndicator}>
          <Text style={styles.keypadTypingText}>
            Typing into: {focusField === 'reading' ? 'Reading' : focusField === 'am' ? 'Morning units' : 'Evening units'}
          </Text>
          <Text style={styles.keypadUnitHint}>
            {focusField === 'reading' ? 'mg/dL' : 'units'}
          </Text>
        </View>

        <View style={styles.keypadGrid}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'del'].map((k) => (
            <TouchableOpacity
              key={k}
              style={[styles.keyBtn, k === 'del' && styles.delKeyBtn]}
              onPress={() => handleKeyPress(k)}
            >
              <Text style={[styles.keyText, k === 'del' && styles.delKeyText]}>
                {k === 'del' ? '⌫' : k}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, canSave ? styles.saveBtnActive : styles.saveBtnDisabled]}
          disabled={!canSave}
          onPress={handleSave}
        >
          <Text style={[styles.saveText, canSave ? styles.saveTextActive : styles.saveTextDisabled]}>
            {canSave ? 'Save reading' : 'Enter a reading to save'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Jump to Date Modal */}
      <Modal visible={isJumpModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Jump to Date</Text>
            <Text style={styles.modalSubtitle}>Enter date in YYYY-MM-DD format:</Text>
            <TextInput
              style={styles.modalInput}
              value={jumpDateInput}
              onChangeText={setJumpDateInput}
              placeholder="YYYY-MM-DD"
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsJumpModalOpen(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleJumpDateConfirm}
              >
                <Text style={styles.modalConfirmText}>Jump</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF9F4' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  closeBtn: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#F0EDE5', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 18, fontWeight: '600', color: '#3D4C47' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#14201C' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 16 },
  dateCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, padding: 10, borderWidth: 1, borderColor: 'rgba(20,32,28,0.08)' },
  arrowBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#F4F1EA', alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontSize: 20, fontWeight: '700', color: '#3D4C47' },
  dateCenter: { flex: 1, alignItems: 'center' },
  sectionCaption: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, color: '#8B9A94' },
  dateText: { fontSize: 16, fontWeight: '700', color: '#14201C', marginTop: 2 },
  sectionHeader: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: '#8B9A94', marginTop: 14, marginBottom: 8 },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotChip: { width: '48.5%', backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(20,32,28,0.08)', borderRadius: 14, padding: 12 },
  slotChipActive: { backgroundColor: '#0D6E5E', borderColor: '#0D6E5E' },
  slotName: { fontSize: 13.5, fontWeight: '700', color: '#14201C' },
  slotNameActive: { color: '#EAF6F2' },
  slotTime: { fontSize: 11, fontWeight: '600', color: '#8B9A94', marginTop: 2 },
  slotTimeActive: { color: 'rgba(234,246,242,0.72)' },
  customContainer: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#0D6E5E', borderRadius: 14, padding: 12, marginTop: 8 },
  customInput: { fontSize: 15, fontWeight: '600', borderBottomWidth: 1.5, borderBottomColor: 'rgba(20,32,28,0.1)', paddingVertical: 6 },
  customTimeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 },
  customTimeLabel: { fontSize: 12.5, fontWeight: '600', color: '#3D4C47' },
  customTimeInput: { flex: 1, backgroundColor: '#FBF9F4', borderWidth: 1, borderColor: 'rgba(20,32,28,0.12)', borderRadius: 8, padding: 6, fontSize: 13, fontWeight: '600' },
  readingCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 18, padding: 14, borderWidth: 1.5, borderColor: 'rgba(20,32,28,0.08)' },
  readingValRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  readingValue: { fontSize: 32, fontWeight: '800', color: '#14201C' },
  placeholderValue: { color: '#C6CFCB' },
  readingUnit: { fontSize: 13, fontWeight: '700', color: '#8B9A94' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  insulinGrid: { flexDirection: 'row', gap: 10 },
  doseCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 12, borderWidth: 1.5, borderColor: 'rgba(20,32,28,0.08)' },
  doseHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  doseDot: { width: 7, height: 7, borderRadius: 4 },
  doseLabel: { fontSize: 11.5, fontWeight: '700', color: '#3D4C47' },
  doseValRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 6 },
  doseValue: { fontSize: 24, fontWeight: '800', color: '#14201C' },
  doseUnit: { fontSize: 12, fontWeight: '700', color: '#8B9A94' },
  activeCardBorder: { borderColor: '#0D6E5E' },
  helperText: { fontSize: 11.5, color: '#8B9A94', marginTop: 8, textAlign: 'center' },
  keypadWrapper: { backgroundColor: '#F2EFE8', borderTopWidth: 1, borderTopColor: 'rgba(20,32,28,0.08)', padding: 10 },
  keypadIndicator: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6, marginBottom: 8 },
  keypadTypingText: { fontSize: 11.5, fontWeight: '700', color: '#3D4C47' },
  keypadUnitHint: { fontSize: 11, fontWeight: '600', color: '#8B9A94' },
  keypadGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'space-between' },
  keyBtn: { width: '31.5%', height: 48, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(20,32,28,0.08)', alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 20, fontWeight: '700', color: '#14201C' },
  delKeyBtn: { backgroundColor: '#E4E0D6' },
  delKeyText: { fontSize: 18 },
  saveBtn: { height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  saveBtnActive: { backgroundColor: '#0D6E5E' },
  saveBtnDisabled: { backgroundColor: '#E4E0D6' },
  saveText: { fontSize: 15, fontWeight: '700' },
  saveTextActive: { color: '#EAF6F2' },
  saveTextDisabled: { color: '#9DA8A3' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', backgroundColor: '#FBF9F4', borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#14201C', marginBottom: 4 },
  modalSubtitle: { fontSize: 12, color: '#8B9A94', marginBottom: 12 },
  modalInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(20,32,28,0.15)', borderRadius: 10, padding: 10, fontSize: 15, fontWeight: '600', marginBottom: 16 },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalCancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  modalCancelText: { fontSize: 14, fontWeight: '700', color: '#8B9A94' },
  modalConfirmBtn: { backgroundColor: '#0D6E5E', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  modalConfirmText: { fontSize: 14, fontWeight: '700', color: '#EAF6F2' },
});