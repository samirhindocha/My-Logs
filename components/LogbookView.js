import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { SLOTS } from '../constants/theme';
import { formatDateHeader, getReadingStatus } from '../utils/storage';

export default function LogbookView({
  entries = [],
  onOpenExport,
  onOpenConfig,
  onGoTrends,
  onOpenEntry,
  onDeleteEntry,
  onToggleHideEntry,
}) {
  const [selectedAvgSlot, setSelectedAvgSlot] = useState('Fasting');
  const [pickerOpen, setPickerOpen] = useState(false);

  const byDate = {};
  entries.forEach((e) => {
    byDate[e.date] = byDate[e.date] || [];
    byDate[e.date].push(e);
  });
  const dateKeys = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  // Dynamic slot average
  const slotMatches = entries.filter(
    (e) => e.slot === selectedAvgSlot && e.reading && !e.isExtremeLow && !e.isExtremeHigh
  );
  const avgValue = slotMatches.length
    ? Math.round(slotMatches.reduce((acc, c) => acc + Number(c.reading), 0) / slotMatches.length)
    : '—';

  // Units today
  const todayStr = new Date().toISOString().split('T')[0];
  const todayEntries = entries.filter((e) => e.date === todayStr);
  const totalUnitsToday = todayEntries.reduce(
    (acc, curr) => acc + (Number(curr.am) || 0) + (Number(curr.pm) || 0) + (Number(curr.extra) || 0),
    0
  );

  // Single Day Plain Text Export
  const handleExportSingleDay = async (dateStr) => {
    const dayItems = byDate[dateStr] || [];
    const parts = dateStr.split('-');
    const formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;

    const getVal = (slotName) => {
      const match = dayItems.find((e) => e.slot === slotName);
      if (!match) return '—';
      return match.reading || '—';
    };

    // Extract insulin doses
    let amDose = '—';
    let pmDose = '—';
    dayItems.forEach((e) => {
      if (e.am) amDose = e.am;
      if (e.pm) pmDose = e.pm;
    });

    const reportText =
`Date - ${formattedDate}

Fasting: ${getVal('Fasting')}
Before Lunch: ${getVal('Before Lunch')}
After Lunch 2hr: ${getVal('After Lunch 2hr')}
Before Dinner: ${getVal('Before Dinner')}
After Dinner 2hr: ${getVal('After Dinner')}
3 AM: ${getVal('3 AM')}

Insulin  
Before Breakfast: ${amDose}
Before Dinner: ${pmDose}`;

    const fileName = `Glucose_Log_${dateStr}.txt`;

    try {
      if (Platform.OS === 'web') {
        const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }

      const file = new File(Paths.cache, fileName);
      if (file.exists) file.delete();
      file.write(reportText);
      await Sharing.shareAsync(file.uri, { UTI: 'public.plain-text', mimeType: 'text/plain' });
    } catch (e) {
      Alert.alert('Export Day Report', reportText);
    }
  };

  return (
    <View style={styles.flexOne}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appSubtitle}>LOGBOOK</Text>
          <Text style={styles.appTitle}>This week</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.configBtn} onPress={onOpenConfig}>
            <Text style={styles.configIcon}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportBtn} onPress={onOpenExport}>
            <Text style={styles.exportIcon}>⤓</Text>
            <Text style={styles.exportBtnText}>Export</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary Cards */}
      <View style={styles.statsContainer}>
        <TouchableOpacity style={styles.statBoxPrimary} onPress={() => setPickerOpen(true)}>
          <View style={styles.metricHeaderRow}>
            <Text style={styles.statLabelPrimary}>Avg {selectedAvgSlot}</Text>
            <Text style={styles.chevronIcon}>▾</Text>
          </View>
          <View style={styles.rowBaseline}>
            <Text style={styles.statValuePrimary}>{avgValue}</Text>
            {avgValue !== '—' && <Text style={styles.unitPrimary}> mg/dL</Text>}
          </View>
          <Text style={styles.statSubPrimary}>Tap to change slot</Text>
        </TouchableOpacity>

        <View style={styles.statBoxSecondary}>
          <Text style={styles.statLabelSecondary}>Units today</Text>
          <View style={styles.rowBaseline}>
            <Text style={styles.statValueSecondary}>{totalUnitsToday}</Text>
            <Text style={styles.unitSecondary}> u</Text>
          </View>
          <Text style={styles.statSubSecondary}>{todayEntries.length} doses recorded</Text>
        </View>
      </View>

      {/* Day Groups List */}
      <ScrollView contentContainerStyle={styles.listContent}>
        {entries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No logs yet</Text>
            <Text style={styles.emptySub}>Tap '+' below to add your first reading</Text>
          </View>
        ) : (
          dateKeys.map((dateStr) => {
            const items = byDate[dateStr];
            return (
              <View key={dateStr} style={styles.dateGroup}>
                <View style={styles.dateGroupHeader}>
                  <Text style={styles.dateGroupTitle}>{formatDateHeader(dateStr)}</Text>
                  <View style={styles.divider} />
                  <TouchableOpacity
                    style={styles.dayExportBtn}
                    onPress={() => handleExportSingleDay(dateStr)}
                  >
                    <Text style={styles.dayExportText}>📄 Export Day</Text>
                  </TouchableOpacity>
                </View>

                {items.map((item) => {
                  const status = getReadingStatus(item.reading, item.isExtremeLow, item.isExtremeHigh);
                  const doseMeta = [];
                  if (item.time) doseMeta.push(item.time);
                  if (item.am) doseMeta.push(`${item.am}u AM`);
                  if (item.pm) doseMeta.push(`${item.pm}u PM`);
                  if (item.extra) doseMeta.push(`${item.extra}u Ext`);

                  const displayVal = item.reading;

                  return (
                    <View key={item.id} style={[styles.card, item.hidden && styles.cardHidden]}>
                      <View style={[styles.colorDot, { backgroundColor: status.color }]} />
                      <View style={styles.cardMain}>
                        <Text style={styles.cardTitle}>{item.slot}</Text>
                        <Text style={styles.cardMeta}>
                          {doseMeta.length ? doseMeta.join('  ·  ') : 'No dose recorded'}
                        </Text>
                      </View>

                      <View style={styles.cardRight}>
                        <Text style={[styles.cardValue, { color: status.color }]}>
                          {displayVal}
                        </Text>
                        <Text style={styles.cardStatus}>{status.text}</Text>
                      </View>

                      <View style={styles.actionColumn}>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => onToggleHideEntry(item.id)}>
                          <Text style={styles.actionIcon}>{item.hidden ? '🚫' : '👁'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => onDeleteEntry(item.id)}>
                          <Text style={styles.actionIcon}>🗑</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Avg Slot Picker Modal */}
      <Modal visible={pickerOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPickerOpen(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choose Slot Average</Text>
            {SLOTS.filter((s) => s.name !== 'Custom').map((s) => (
              <TouchableOpacity
                key={s.name}
                style={[styles.pickerOption, selectedAvgSlot === s.name && styles.pickerOptionActive]}
                onPress={() => {
                  setSelectedAvgSlot(s.name);
                  setPickerOpen(false);
                }}
              >
                <Text style={[styles.pickerOptionText, selectedAvgSlot === s.name && styles.pickerOptionTextActive]}>
                  {s.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Floating Bottom Nav */}
      <View style={styles.bottomNavContainer}>
        <View style={styles.bottomNav}>
          <TouchableOpacity style={[styles.tabBtn, styles.tabBtnActive]}>
            <Text style={[styles.tabText, styles.tabTextActive]}>Logbook</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabBtn} onPress={onGoTrends}>
            <Text style={styles.tabText}>Trends</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={onOpenEntry}>
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flexOne: { flex: 1, backgroundColor: '#FBF9F4' },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  configBtn: { backgroundColor: '#F0EDE5', padding: 8, borderRadius: 12 },
  configIcon: { fontSize: 16 },
  appSubtitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: '#8B9A94' },
  appTitle: { fontSize: 27, fontWeight: '800', letterSpacing: -0.5, color: '#14201C', marginTop: 3 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0D6E5E', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, gap: 5 },
  exportIcon: { color: '#EAF6F2', fontSize: 14, fontWeight: '800' },
  exportBtnText: { color: '#EAF6F2', fontWeight: '700', fontSize: 12.5 },
  statsContainer: { paddingHorizontal: 20, flexDirection: 'row', gap: 10 },
  statBoxPrimary: { flex: 1, backgroundColor: '#0D6E5E', borderRadius: 18, padding: 14 },
  metricHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chevronIcon: { color: '#EAF6F2', fontSize: 14 },
  statLabelPrimary: { fontSize: 10, fontWeight: '700', color: '#EAF6F2', opacity: 0.85, textTransform: 'uppercase', letterSpacing: 0.8 },
  statValuePrimary: { fontSize: 28, fontWeight: '800', color: '#EAF6F2', letterSpacing: -0.5 },
  unitPrimary: { fontSize: 11, fontWeight: '600', color: '#EAF6F2', opacity: 0.75 },
  statSubPrimary: { fontSize: 11, fontWeight: '500', color: '#EAF6F2', opacity: 0.75, marginTop: 2 },
  statBoxSecondary: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(20,32,28,0.09)', borderRadius: 18, padding: 14 },
  statLabelSecondary: { fontSize: 10, fontWeight: '700', color: '#8B9A94', textTransform: 'uppercase', letterSpacing: 1 },
  statValueSecondary: { fontSize: 28, fontWeight: '800', color: '#14201C', letterSpacing: -0.5 },
  unitSecondary: { fontSize: 11, fontWeight: '600', color: '#8B9A94' },
  statSubSecondary: { fontSize: 11, fontWeight: '500', color: '#8B9A94', marginTop: 2 },
  rowBaseline: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  listContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 110 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#14201C', marginBottom: 4 },
  emptySub: { fontSize: 13, color: '#8B9A94' },
  dateGroup: { marginBottom: 18 },
  dateGroupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 9 },
  dateGroupTitle: { fontSize: 12, fontWeight: '700', color: '#14201C', letterSpacing: 0.4 },
  divider: { flex: 1, height: 1, backgroundColor: 'rgba(20,32,28,0.09)' },
  dayExportBtn: { backgroundColor: '#F0EDE5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  dayExportText: { fontSize: 11, fontWeight: '700', color: '#3D4C47' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(20,32,28,0.09)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8, gap: 10 },
  cardHidden: { opacity: 0.4, backgroundColor: '#F0EDE5' },
  colorDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  cardMain: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 14, fontWeight: '700', letterSpacing: -0.1, color: '#14201C' },
  cardMeta: { fontSize: 11, fontWeight: '500', color: '#8B9A94', marginTop: 2 },
  cardRight: { alignItems: 'flex-end' },
  cardValue: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  cardStatus: { fontSize: 9.5, fontWeight: '700', color: '#8B9A94', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 },
  actionColumn: { flexDirection: 'row', gap: 6, paddingLeft: 4 },
  actionBtn: { padding: 4 },
  actionIcon: { fontSize: 13 },
  bottomNavContainer: { position: 'absolute', left: 0, right: 0, bottom: 14, paddingHorizontal: 18 },
  bottomNav: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#14201C', borderRadius: 22, padding: 8, shadowColor: '#14201C', shadowOpacity: 0.24, shadowRadius: 12, elevation: 6 },
  tabBtn: { flex: 1, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tabBtnActive: { backgroundColor: 'rgba(255,255,255,0.12)' },
  tabText: { color: 'rgba(251,249,244,0.55)', fontWeight: '700', fontSize: 13.5 },
  tabTextActive: { color: '#FBF9F4' },
  addBtn: { width: 52, height: 44, borderRadius: 16, backgroundColor: '#83E0CE', alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontSize: 25, fontWeight: '600', color: '#053C33' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 300, backgroundColor: '#FBF9F4', borderRadius: 20, padding: 18 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#14201C', marginBottom: 12 },
  pickerOption: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, marginBottom: 4 },
  pickerOptionActive: { backgroundColor: '#0D6E5E' },
  pickerOptionText: { fontSize: 14, fontWeight: '700', color: '#14201C' },
  pickerOptionTextActive: { color: '#EAF6F2' },
});