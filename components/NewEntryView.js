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
import * as ImagePicker from 'expo-image-picker';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { SLOTS } from '../constants/theme';
import { formatDateDisplay, getReadingStatus } from '../utils/storage';
import { parseAccuChekDisplay } from '../utils/ocrParser';

const CORE_SLOT_NAMES = SLOTS.filter((s) => s.name !== 'Custom').map((s) => s.name);

export default function NewEntryView({ existingEntries = [], onSave, onCancel, editingEntry = null, onImportMySugr }) {
  const isCustomEditingSlot = !!editingEntry && !CORE_SLOT_NAMES.includes(editingEntry.slot);
  const editedTimeMatch = editingEntry?.time?.match(/^(\d{1,2}:\d{2})\s*(AM|PM)$/i);

  const [selectedDate, setSelectedDate] = useState(
    editingEntry ? new Date(editingEntry.date) : new Date()
  );
  const [selectedSlot, setSelectedSlot] = useState(
    editingEntry ? (isCustomEditingSlot ? 'Custom' : editingEntry.slot) : 'Fasting'
  );
  const [customLabel, setCustomLabel] = useState(isCustomEditingSlot ? editingEntry.slot : '');
  const [customTime, setCustomTime] = useState(editedTimeMatch ? editedTimeMatch[1] : '10:30');
  const [customPeriod, setCustomPeriod] = useState(editedTimeMatch ? editedTimeMatch[2].toUpperCase() : 'AM');

  const [focusField, setFocusField] = useState('reading');
  const [reading, setReading] = useState(editingEntry ? String(editingEntry.reading ?? '') : '');

  const lastEntryWithUnits = [...existingEntries].reverse().find((e) => e.am || e.pm || e.extra);
  const [amUnits, setAmUnits] = useState(editingEntry ? editingEntry.am || '' : lastEntryWithUnits?.am || '');
  const [pmUnits, setPmUnits] = useState(editingEntry ? editingEntry.pm || '' : lastEntryWithUnits?.pm || '');
  const [extraUnits, setExtraUnits] = useState(editingEntry ? editingEntry.extra || '' : '');

  const [isJumpModalOpen, setIsJumpModalOpen] = useState(false);
  const [jumpDateInput, setJumpDateInput] = useState(
    new Date().toISOString().split('T')[0]
  );

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

  const handleCaptureMeter = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is needed to scan your glucometer.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const recognized = await TextRecognition.recognize(result.assets[0].uri);
        const lines = recognized.blocks.flatMap((block) => block.lines.map((line) => line.text));
        const parsed = parseAccuChekDisplay(lines);

        if (!parsed.reading) {
          Alert.alert(
            'No Reading Found',
            `Could not detect a glucose value in the photo. Please try again or enter it manually.\n\nDetected text:\n${recognized.text || '(none)'}`
          );
          return;
        }

        setReading(parsed.reading);
        if (parsed.time && selectedSlot === 'Custom') {
          const timeMatch = parsed.time.match(/^(\d{1,2}:\d{2})\s*(AM|PM)$/i);
          if (timeMatch) {
            setCustomTime(timeMatch[1]);
            setCustomPeriod(timeMatch[2].toUpperCase());
          }
        }
        if (parsed.date) {
          const d = new Date(parsed.date);
          if (!isNaN(d.getTime())) setSelectedDate(d);
        }

        Alert.alert(
          'Glucometer Scanned',
          `• Reading: ${parsed.reading} mg/dL\n• Date: ${parsed.date || 'Today'}\n• Time: ${parsed.time || '—'}\n\nPlease review and press "Save reading".`
        );
      }
    } catch (e) {
      Alert.alert('Scanner Error', 'Could not process the meter image.');
    }
  };

  const handleKeyPress = (key) => {
    let currentVal =
      focusField === 'reading'
        ? reading
        : focusField === 'am'
        ? amUnits
        : focusField === 'pm'
        ? pmUnits
        : extraUnits;

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

    if (focusField === 'reading') {
      setReading(nextVal);
    } else if (focusField === 'am') {
      setAmUnits(nextVal);
    } else if (focusField === 'pm') {
      setPmUnits(nextVal);
    } else {
      setExtraUnits(nextVal);
    }
  };

  const isExtremeLow = reading !== '' && parseFloat(reading) < 50;
  const isExtremeHigh = reading !== '' && parseFloat(reading) > 250;
  const status = getReadingStatus(reading, isExtremeLow, isExtremeHigh);
  const canSave = reading.length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const dateStr = selectedDate.toISOString().split('T')[0];
    const finalSlot = selectedSlot === 'Custom' ? customLabel || 'Custom' : selectedSlot;

    const performSave = (id) => {
      onSave({
        id,
        date: dateStr,
        slot: finalSlot,
        time: selectedSlot === 'Custom' ? `${customTime} ${customPeriod}` : '',
        reading: parseFloat(reading),
        isExtremeLow,
        isExtremeHigh,
        am: amUnits,
        pm: pmUnits,
        extra: extraUnits,
        hidden: false,
      });
    };

    // Editing an existing record just updates it in place — no duplicate check needed.
    if (editingEntry) {
      performSave(editingEntry.id);
      return;
    }

    const existingIndex = existingEntries.findIndex(
      (e) => e.date === dateStr && e.slot === finalSlot
    );

    if (existingIndex >= 0) {
      Alert.alert(
        'Duplicate Entry',
        `A log for ${finalSlot} on this date already exists. Do you want to replace it?`,
        [
          { text: 'Discard', style: 'cancel' },
          { text: 'Replace', style: 'destructive', onPress: () => performSave(existingEntries[existingIndex].id) },
        ]
      );
    } else {
      performSave(Date.now().toString());
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={onCancel}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{editingEntry ? 'Edit reading' : 'New reading'}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.importBtn} onPress={onImportMySugr}>
            <Text style={styles.importIcon}>📥</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cameraScanBtn} onPress={handleCaptureMeter}>
            <Text style={styles.cameraIcon}>📷 Scan</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Date Card */}
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

        {/* Time Slots */}
        <Text style={styles.sectionHeader}>TIME SLOT</Text>
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
              </TouchableOpacity>
            );
          })}
        </View>

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
              <View style={styles.periodToggle}>
                {['AM', 'PM'].map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[styles.periodOptionBtn, customPeriod === period && styles.periodOptionBtnActive]}
                    onPress={() => setCustomPeriod(period)}
                  >
                    <Text style={[styles.periodOptionBtnText, customPeriod === period && styles.periodOptionBtnTextActive]}>
                      {period}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Reading Card */}
        <Text style={styles.sectionHeader}>READING</Text>
        <TouchableOpacity
          style={[styles.readingCard, focusField === 'reading' && styles.activeCardBorder]}
          onPress={() => setFocusField('reading')}
        >
          <View style={styles.readingValRow}>
            <Text style={[styles.readingValue, !reading && styles.placeholderValue]}>
              {reading || '––'}
            </Text>
            <Text style={styles.readingUnit}>mg/dL</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
          </View>
        </TouchableOpacity>

        {/* Insulin Units */}
        <Text style={styles.sectionHeader}>INSULIN UNITS</Text>
        <View style={styles.insulinGrid}>
          <TouchableOpacity
            style={[styles.doseCard, focusField === 'am' && styles.activeCardBorder]}
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
            style={[styles.doseCard, focusField === 'pm' && styles.activeCardBorder]}
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

          <TouchableOpacity
            style={[styles.doseCard, focusField === 'extra' && styles.activeCardBorder]}
            onPress={() => setFocusField('extra')}
          >
            <View style={styles.doseHeader}>
              <View style={[styles.doseDot, { backgroundColor: '#0D6E5E' }]} />
              <Text style={styles.doseLabel}>Extra</Text>
            </View>
            <View style={styles.doseValRow}>
              <Text style={[styles.doseValue, !extraUnits && styles.placeholderValue]}>
                {extraUnits || '––'}
              </Text>
              <Text style={styles.doseUnit}>u</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.helperText}>
          Units auto-fill from previous entry. Values &lt;50 or &gt;250 automatically flag as extreme.
        </Text>
      </ScrollView>

      {/* Keypad */}
      <View style={styles.keypadWrapper}>
        <View style={styles.keypadIndicator}>
          <Text style={styles.keypadTypingText}>
            Typing into:{' '}
            {focusField === 'reading'
              ? 'Reading'
              : focusField === 'am'
              ? 'Morning units'
              : focusField === 'pm'
              ? 'Evening units'
              : 'Extra units'}
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
            {canSave ? (editingEntry ? 'Update reading' : 'Save reading') : 'Enter a reading to save'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Jump Modal */}
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
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setIsJumpModalOpen(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleJumpDateConfirm}>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  closeBtn: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#F0EDE5', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 18, fontWeight: '600', color: '#3D4C47' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#14201C' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  importBtn: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#F0EDE5', alignItems: 'center', justifyContent: 'center' },
  importIcon: { fontSize: 16 },
  cameraScanBtn: { backgroundColor: '#0D6E5E', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  cameraIcon: { color: '#EAF6F2', fontWeight: '700', fontSize: 12.5 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 16 },
  dateCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, padding: 10, borderWidth: 1, borderColor: 'rgba(20,32,28,0.08)' },
  arrowBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#F4F1EA', alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontSize: 20, fontWeight: '700', color: '#3D4C47' },
  dateCenter: { flex: 1, alignItems: 'center' },
  sectionCaption: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, color: '#8B9A94' },
  dateText: { fontSize: 16, fontWeight: '700', color: '#14201C', marginTop: 2 },
  sectionHeader: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: '#8B9A94', marginTop: 14, marginBottom: 8 },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotChip: { width: '48.5%', backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(20,32,28,0.08)', borderRadius: 14, padding: 14, alignItems: 'center' },
  slotChipActive: { backgroundColor: '#0D6E5E', borderColor: '#0D6E5E' },
  slotName: { fontSize: 13.5, fontWeight: '700', color: '#14201C' },
  slotNameActive: { color: '#EAF6F2' },
  customContainer: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#0D6E5E', borderRadius: 14, padding: 12, marginTop: 8 },
  customInput: { fontSize: 15, fontWeight: '600', borderBottomWidth: 1.5, borderBottomColor: 'rgba(20,32,28,0.1)', paddingVertical: 6 },
  customTimeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 },
  customTimeLabel: { fontSize: 12.5, fontWeight: '600', color: '#3D4C47' },
  customTimeInput: { flex: 1, backgroundColor: '#FBF9F4', borderWidth: 1, borderColor: 'rgba(20,32,28,0.12)', borderRadius: 8, padding: 6, fontSize: 13, fontWeight: '600' },
  periodToggle: { flexDirection: 'row', backgroundColor: '#FBF9F4', borderWidth: 1, borderColor: 'rgba(20,32,28,0.12)', borderRadius: 8, padding: 2, gap: 2 },
  periodOptionBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  periodOptionBtnActive: { backgroundColor: '#0D6E5E' },
  periodOptionBtnText: { fontSize: 12, fontWeight: '700', color: '#3D4C47' },
  periodOptionBtnTextActive: { color: '#EAF6F2' },
  readingCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 18, padding: 14, borderWidth: 1.5, borderColor: 'rgba(20,32,28,0.08)' },
  readingValRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  readingValue: { fontSize: 32, fontWeight: '800', color: '#14201C' },
  placeholderValue: { color: '#C6CFCB' },
  readingUnit: { fontSize: 13, fontWeight: '700', color: '#8B9A94' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  insulinGrid: { flexDirection: 'row', gap: 8 },
  doseCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 10, borderWidth: 1.5, borderColor: 'rgba(20,32,28,0.08)' },
  doseHeader: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  doseDot: { width: 7, height: 7, borderRadius: 4 },
  doseLabel: { fontSize: 11, fontWeight: '700', color: '#3D4C47' },
  doseValRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3, marginTop: 4 },
  doseValue: { fontSize: 20, fontWeight: '800', color: '#14201C' },
  doseUnit: { fontSize: 11, fontWeight: '700', color: '#8B9A94' },
  activeCardBorder: { borderColor: '#0D6E5E' },
  helperText: { fontSize: 11, color: '#8B9A94', marginTop: 8, textAlign: 'center' },
  keypadWrapper: { backgroundColor: '#F2EFE8', borderTopWidth: 1, borderTopColor: 'rgba(20,32,28,0.08)', padding: 10 },
  keypadIndicator: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6, marginBottom: 8 },
  keypadTypingText: { fontSize: 11.5, fontWeight: '700', color: '#3D4C47' },
  keypadUnitHint: { fontSize: 11, fontWeight: '600', color: '#8B9A94' },
  keypadGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'space-between' },
  keyBtn: { width: '31.5%', height: 46, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(20,32,28,0.08)', alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 20, fontWeight: '700', color: '#14201C' },
  delKeyBtn: { backgroundColor: '#E4E0D6' },
  delKeyText: { fontSize: 18 },
  saveBtn: { height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  saveBtnActive: { backgroundColor: '#0D6E5E' },
  saveBtnDisabled: { backgroundColor: '#E4E0D6' },
  saveText: { fontSize: 15, fontWeight: '700' },
  saveTextActive: { color: '#EAF6F2' },
  saveTextDisabled: { color: '#9DA8A3' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 320, backgroundColor: '#FBF9F4', borderRadius: 20, padding: 18 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#14201C', marginBottom: 4 },
  modalSubtitle: { fontSize: 12, color: '#8B9A94', marginBottom: 12 },
  modalInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(20,32,28,0.15)', borderRadius: 10, padding: 10, fontSize: 15, fontWeight: '600', marginBottom: 16 },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalCancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  modalCancelText: { fontSize: 14, fontWeight: '700', color: '#8B9A94' },
  modalConfirmBtn: { backgroundColor: '#0D6E5E', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  modalConfirmText: { fontSize: 14, fontWeight: '700', color: '#EAF6F2' },
});