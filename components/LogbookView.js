import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { formatDateHeader, getReadingStatus } from '../utils/storage';

export default function LogbookView({ entries = [], onOpenExport, onGoTrends, onOpenEntry }) {
  const byDate = {};
  entries.forEach((e) => {
    byDate[e.date] = byDate[e.date] || [];
    byDate[e.date].push(e);
  });
  const dateKeys = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  const fastingEntries = entries.filter((e) => e.slot === 'Fasting' && e.reading);
  const avgFasting = fastingEntries.length
    ? Math.round(
        fastingEntries.reduce((acc, curr) => acc + Number(curr.reading), 0) /
          fastingEntries.length
      )
    : '—';

  const todayStr = new Date().toISOString().split('T')[0];
  const todayEntries = entries.filter((e) => e.date === todayStr);
  const amToday = todayEntries.reduce((acc, curr) => acc + (Number(curr.am) || 0), 0);
  const pmToday = todayEntries.reduce((acc, curr) => acc + (Number(curr.pm) || 0), 0);
  const totalUnitsToday = amToday + pmToday;

  return (
    <View style={styles.flexOne}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appSubtitle}>LOGBOOK</Text>
          <Text style={styles.appTitle}>This week</Text>
        </View>
        <TouchableOpacity style={styles.exportBtn} onPress={onOpenExport}>
          <Text style={styles.exportIcon}>⤓</Text>
          <Text style={styles.exportBtnText}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statBoxPrimary}>
          <Text style={styles.statLabelPrimary}>Avg fasting</Text>
          <View style={styles.rowBaseline}>
            <Text style={styles.statValuePrimary}>{avgFasting}</Text>
            {avgFasting !== '—' && <Text style={styles.unitPrimary}> mg/dL</Text>}
          </View>
          <Text style={styles.statSubPrimary}>7-day average</Text>
        </View>

        <View style={styles.statBoxSecondary}>
          <Text style={styles.statLabelSecondary}>Units today</Text>
          <View style={styles.rowBaseline}>
            <Text style={styles.statValueSecondary}>{totalUnitsToday}</Text>
            <Text style={styles.unitSecondary}> u</Text>
          </View>
          <Text style={styles.statSubSecondary}>
            {amToday}u morning · {pmToday}u evening
          </Text>
        </View>
      </View>

      {/* Log Entries */}
      <ScrollView contentContainerStyle={styles.listContent}>
        {dateKeys.map((dateStr) => {
          const items = byDate[dateStr];
          const totalDayUnits = items.reduce(
            (acc, curr) => acc + (Number(curr.am) || 0) + (Number(curr.pm) || 0),
            0
          );

          return (
            <View key={dateStr} style={styles.dateGroup}>
              <View style={styles.dateGroupHeader}>
                <Text style={styles.dateGroupTitle}>{formatDateHeader(dateStr)}</Text>
                <View style={styles.divider} />
                <Text style={styles.dateGroupCount}>
                  {totalDayUnits > 0 ? `${totalDayUnits} units` : 'no dose logged'}
                </Text>
              </View>

              {items.map((item) => {
                const status = getReadingStatus(item.reading);
                const doseMeta = [];
                if (item.time) doseMeta.push(item.time);
                if (item.am) doseMeta.push(`${item.am}u AM`);
                if (item.pm) doseMeta.push(`${item.pm}u PM`);

                return (
                  <View key={item.id} style={styles.card}>
                    <View style={[styles.colorDot, { backgroundColor: status.color }]} />
                    <View style={styles.cardMain}>
                      <Text style={styles.cardTitle}>{item.slot || 'Custom'}</Text>
                      <Text style={styles.cardMeta}>{doseMeta.join('  ·  ')}</Text>
                    </View>
                    <View style={styles.cardRight}>
                      <Text style={[styles.cardValue, { color: status.color }]}>
                        {item.reading}
                      </Text>
                      <Text style={styles.cardStatus}>{status.text}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>

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
  header: { paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  appSubtitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: '#8B9A94' },
  appTitle: { fontSize: 27, fontWeight: '800', letterSpacing: -0.5, color: '#14201C', marginTop: 3 },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D6E5E',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 5,
  },
  exportIcon: {
    color: '#EAF6F2',
    fontSize: 14,
    fontWeight: '800',
  },
  exportBtnText: {
    color: '#EAF6F2',
    fontWeight: '700',
    fontSize: 12.5,
  },
  statsContainer: { paddingHorizontal: 20, flexDirection: 'row', gap: 10 },
  statBoxPrimary: { flex: 1, backgroundColor: '#0D6E5E', borderRadius: 18, padding: 14 },
  statLabelPrimary: { fontSize: 10, fontWeight: '700', color: '#EAF6F2', opacity: 0.72, textTransform: 'uppercase', letterSpacing: 1 },
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
  dateGroup: { marginBottom: 18 },
  dateGroupHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 9 },
  dateGroupTitle: { fontSize: 12, fontWeight: '700', color: '#14201C', letterSpacing: 0.4 },
  divider: { flex: 1, height: 1, backgroundColor: 'rgba(20,32,28,0.09)' },
  dateGroupCount: { fontSize: 11, fontWeight: '600', color: '#8B9A94' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(20,32,28,0.09)', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8, gap: 12 },
  colorDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  cardMain: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 14.5, fontWeight: '700', letterSpacing: -0.1, color: '#14201C' },
  cardMeta: { fontSize: 11.5, fontWeight: '500', color: '#8B9A94', marginTop: 2 },
  cardRight: { alignItems: 'flex-end' },
  cardValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  cardStatus: { fontSize: 10.5, fontWeight: '700', color: '#8B9A94', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 },
  bottomNavContainer: { position: 'absolute', left: 0, right: 0, bottom: 14, paddingHorizontal: 18 },
  bottomNav: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#14201C', borderRadius: 22, padding: 8, shadowColor: '#14201C', shadowOpacity: 0.24, shadowRadius: 12, elevation: 6 },
  tabBtn: { flex: 1, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tabBtnActive: { backgroundColor: 'rgba(255,255,255,0.12)' },
  tabText: { color: 'rgba(251,249,244,0.55)', fontWeight: '700', fontSize: 13.5 },
  tabTextActive: { color: '#FBF9F4' },
  addBtn: { width: 52, height: 44, borderRadius: 16, backgroundColor: '#83E0CE', alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontSize: 25, fontWeight: '600', color: '#053C33' },
});