import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SLOTS } from '../constants/theme';
import { getReadingStatus } from '../utils/storage';

const PERIOD_OPTIONS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 15 days', days: 15 },
  { label: 'Last 1 month', days: 30 },
  { label: 'Last 2 months', days: 60 },
  { label: 'Last 3 months', days: 90 },
];

const Y_AXIS_LEVELS = [250, 200, 140, 100, 70];
const Y_AXIS_WIDTH = 30;

const formatAxisDate = (dateStr) => {
  const parts = (dateStr || '').split('-');
  if (parts.length < 3) return dateStr || '';
  return `${parts[2]}/${parts[1]}`;
};

export default function TrendsView({ entries = [], onGoLog, onGoEntry }) {
  const [selectedPeriod, setSelectedPeriod] = useState(PERIOD_OPTIONS[4]); // Default: Last 3 months
  const [periodPickerOpen, setPeriodPickerOpen] = useState(false);
  const [plotWidth, setPlotWidth] = useState(0);

  // Filter entries within selected period range
  const now = new Date();
  const cutoffDate = new Date();
  cutoffDate.setDate(now.getDate() - selectedPeriod.days);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];

  const periodEntries = entries.filter((e) => e.date >= cutoffStr && !e.hidden);

  // All valid numeric glucose readings plotted chronologically
  const allReadings = periodEntries
    .filter((e) => e.reading && !isNaN(e.reading) && !e.isExtremeLow && !e.isExtremeHigh)
    .sort((a, b) => {
      if (a.date === b.date) {
        return (a.time || '').localeCompare(b.time || '');
      }
      return a.date.localeCompare(b.date);
    });

  // Insulin split averages
  const amDoses = periodEntries.map((e) => Number(e.am)).filter((v) => v > 0);
  const pmDoses = periodEntries.map((e) => Number(e.pm)).filter((v) => v > 0);
  const avgMorning = amDoses.length
    ? (amDoses.reduce((a, b) => a + b, 0) / amDoses.length).toFixed(1)
    : '0.0';
  const avgEvening = pmDoses.length
    ? (pmDoses.reduce((a, b) => a + b, 0) / pmDoses.length).toFixed(1)
    : '0.0';

  // Average by time slot
  const slotAverages = SLOTS.filter((s) => s.name !== 'Custom').map((slot) => {
    const matching = periodEntries.filter(
      (e) => e.slot === slot.name && e.reading && !e.isExtremeLow && !e.isExtremeHigh
    );
    const avg = matching.length
      ? Math.round(matching.reduce((acc, curr) => acc + Number(curr.reading), 0) / matching.length)
      : null;
    return { name: slot.name, avg };
  });

  // Chart coordinate calculation (bounded to 20 - 350 mg/dL to prevent top/bottom dot cutoffs)
  const chartHeight = 140;
  const yMin = 20;
  const yMax = 350;
  const getY = (val) => {
    const clamped = Math.max(yMin, Math.min(yMax, val));
    return chartHeight - ((clamped - yMin) / (yMax - yMin)) * chartHeight;
  };

  const bandTop = getY(140);
  const bandHeight = Math.max(14, getY(70) - getY(140));

  // X axis runs along the real calendar timeline, from the start of the selected
  // period through to today — so the plot always extends up to "today", even if
  // the most recent reading was logged a few days ago.
  const periodStartMs = cutoffDate.getTime();
  const todayMs = now.getTime();
  const totalRangeMs = Math.max(1, todayMs - periodStartMs);
  const getX = (dateStr) => {
    const t = new Date(dateStr).getTime();
    const usableWidth = Math.max(0, plotWidth - 12);
    const ratio = Math.min(1, Math.max(0, (t - periodStartMs) / totalRangeMs));
    return 6 + ratio * usableWidth;
  };

  const chartPoints = allReadings.map((item) => {
    const y = getY(Number(item.reading));
    return {
      x: getX(item.date),
      y: Math.max(8, Math.min(chartHeight - 8, y)),
      reading: item.reading,
      slot: item.slot,
      date: item.date,
    };
  });

  // Line segments connecting consecutive readings (pure-View rotated bars, no SVG dependency).
  // RN rotates a View around its own center, so each bar is centered on the segment's midpoint.
  const LINE_THICKNESS = 1.5;
  const lineSegments = chartPoints.slice(1).map((pt, i) => {
    const prev = chartPoints[i];
    const dx = pt.x - prev.x;
    const dy = pt.y - prev.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const midX = (prev.x + pt.x) / 2;
    const midY = (prev.y + pt.y) / 2;
    return { left: midX - length / 2, top: midY - LINE_THICKNESS / 2, length, angle };
  });

  // Evenly-spaced date labels along the bottom axis, spanning the period start through today
  const xAxisLabelCount = 5;
  const xAxisLabels = Array.from({ length: xAxisLabelCount }, (_, i) => {
    const t = periodStartMs + (i / (xAxisLabelCount - 1)) * totalRangeMs;
    const dateStr = new Date(t).toISOString().split('T')[0];
    return { x: getX(dateStr), text: formatAxisDate(dateStr) };
  });

  return (
    <View style={styles.flexOne}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>TRENDS</Text>
          <TouchableOpacity
            style={styles.periodSelectorRow}
            onPress={() => setPeriodPickerOpen(true)}
          >
            <Text style={styles.headerTitle}>{selectedPeriod.label}</Text>
            <Text style={styles.periodChevron}>▾</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* All Readings Trend Chart Card */}
        <View style={styles.card}>
          <View style={styles.chartHeader}>
            <Text style={styles.cardTitle}>All readings</Text>
            <Text style={styles.unitText}>mg/dL</Text>
          </View>

          <View style={styles.chartRow}>
            {/* Y Axis Value Labels */}
            <View style={[styles.yAxisLabels, { height: chartHeight }]}>
              {Y_AXIS_LEVELS.map((level) => (
                <Text key={level} style={[styles.axisLabelY, { top: getY(level) - 7 }]}>
                  {level}
                </Text>
              ))}
            </View>

            <View
              style={[styles.chartArea, { height: chartHeight }]}
              onLayout={(e) => setPlotWidth(e.nativeEvent.layout.width)}
            >
              {/* Target Range Band (70 - 140 mg/dL) */}
              <View style={[styles.rangeBand, { top: bandTop, height: bandHeight }]} />

              {/* Reference Grid Lines */}
              {Y_AXIS_LEVELS.map((level) => (
                <View key={level} style={[styles.gridLine, { top: getY(level) }]} />
              ))}

              {/* Trend Line connecting consecutive readings */}
              {lineSegments.map((seg, i) => (
                <View
                  key={i}
                  style={[
                    styles.lineSegment,
                    {
                      left: seg.left,
                      top: seg.top,
                      width: seg.length,
                      transform: [{ rotate: `${seg.angle}deg` }],
                    },
                  ]}
                />
              ))}

              {/* Plotted Dots for all readings */}
              {chartPoints.map((pt, i) => {
                const dotStatus = getReadingStatus(pt.reading);
                return (
                  <View
                    key={i}
                    style={[
                      styles.dotContainer,
                      { left: pt.x - 6, top: pt.y - 6 },
                    ]}
                  >
                    <View
                      style={[
                        styles.chartDot,
                        { borderColor: dotStatus.color },
                      ]}
                    />
                  </View>
                );
              })}

              {chartPoints.length === 0 && (
                <View style={styles.noDataBox}>
                  <Text style={styles.noDataText}>No readings logged in this period</Text>
                </View>
              )}
            </View>
          </View>

          {/* X Axis Date Labels */}
          {xAxisLabels.length > 0 && (
            <View style={[styles.xAxisRow, { marginLeft: Y_AXIS_WIDTH + 6 }]}>
              {xAxisLabels.map((lbl, i) => (
                <Text
                  key={i}
                  style={[styles.axisLabelX, { left: lbl.x - 20 }]}
                >
                  {lbl.text}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* Average by Time Slot */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Average by time slot</Text>
          <View style={styles.slotsAvgList}>
            {slotAverages.map((slot) => {
              const status = getReadingStatus(slot.avg);
              const barPercent = slot.avg ? Math.min(100, Math.max(8, (slot.avg / 280) * 100)) : 0;

              return (
                <View key={slot.name} style={styles.slotRow}>
                  <View style={styles.slotLabelRow}>
                    <Text style={styles.slotNameText}>{slot.name}</Text>
                    <Text style={styles.slotAvgValue}>{slot.avg || '—'}</Text>
                  </View>
                  <View style={styles.barBackground}>
                    {slot.avg ? (
                      <View
                        style={[
                          styles.barFill,
                          { width: `${barPercent}%`, backgroundColor: status.color },
                        ]}
                      />
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Insulin Split */}
        <View style={styles.insulinSplitCard}>
          <Text style={styles.insulinSplitTitle}>INSULIN SPLIT</Text>
          <View style={styles.insulinSplitRow}>
            <View>
              <Text style={styles.insulinVal}>{avgMorning}u</Text>
              <Text style={styles.insulinSub}>Morning avg</Text>
            </View>
            <View style={styles.insulinDivider} />
            <View>
              <Text style={styles.insulinVal}>{avgEvening}u</Text>
              <Text style={styles.insulinSub}>Evening avg</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Period Selection Modal */}
      <Modal visible={periodPickerOpen} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPeriodPickerOpen(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Period</Text>
            {PERIOD_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.days}
                style={[
                  styles.periodOption,
                  selectedPeriod.days === opt.days && styles.periodOptionActive,
                ]}
                onPress={() => {
                  setSelectedPeriod(opt);
                  setPeriodPickerOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.periodOptionText,
                    selectedPeriod.days === opt.days && styles.periodOptionTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Floating Bottom Nav */}
      <View style={styles.bottomNavContainer}>
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.tabBtn} onPress={onGoLog}>
            <Text style={styles.tabText}>Logbook</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, styles.tabBtnActive]}>
            <Text style={[styles.tabText, styles.tabTextActive]}>Trends</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={onGoEntry}>
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flexOne: { flex: 1, backgroundColor: '#FBF9F4' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: '#8B9A94',
    textTransform: 'uppercase',
  },
  periodSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  headerTitle: {
    fontSize: 27,
    fontWeight: '800',
    color: '#14201C',
    letterSpacing: -0.5,
  },
  periodChevron: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8B9A94',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 110,
  },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(20,32,28,0.09)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#14201C',
  },
  unitText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8B9A94',
  },
  chartRow: {
    flexDirection: 'row',
    marginVertical: 6,
  },
  yAxisLabels: {
    width: Y_AXIS_WIDTH,
    position: 'relative',
    marginRight: 6,
  },
  axisLabelY: {
    position: 'absolute',
    left: 0,
    right: 0,
    fontSize: 9.5,
    fontWeight: '600',
    color: '#8B9A94',
    textAlign: 'right',
  },
  chartArea: {
    position: 'relative',
    flex: 1,
    overflow: 'hidden',
  },
  lineSegment: {
    position: 'absolute',
    height: 1.5,
    backgroundColor: 'rgba(20,32,28,0.28)',
  },
  xAxisRow: {
    position: 'relative',
    height: 14,
  },
  axisLabelX: {
    position: 'absolute',
    width: 40,
    top: 0,
    fontSize: 9.5,
    fontWeight: '600',
    color: '#8B9A94',
    textAlign: 'center',
  },
  rangeBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#DCEDE8',
    borderRadius: 6,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(20,32,28,0.06)',
  },
  dotContainer: {
    position: 'absolute',
    transform: [{ translateX: -6 }],
  },
  chartDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FBF9F4',
    borderWidth: 2.5,
  },
  noDataBox: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    fontSize: 12,
    color: '#8B9A94',
    fontWeight: '600',
  },
  slotsAvgList: {
    marginTop: 14,
    gap: 12,
  },
  slotRow: {
    gap: 5,
  },
  slotLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  slotNameText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#3D4C47',
  },
  slotAvgValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#14201C',
  },
  barBackground: {
    height: 7,
    backgroundColor: '#F0EDE5',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  insulinSplitCard: {
    backgroundColor: '#14201C',
    borderRadius: 20,
    padding: 16,
  },
  insulinSplitTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#8FA8A0',
    textTransform: 'uppercase',
  },
  insulinSplitRow: {
    flexDirection: 'row',
    gap: 28,
    alignItems: 'center',
    marginTop: 10,
  },
  insulinVal: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  insulinSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8FA8A0',
    marginTop: 2,
  },
  insulinDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  bottomNavContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 14,
    paddingHorizontal: 18,
  },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#14201C',
    borderRadius: 22,
    padding: 8,
    shadowColor: '#14201C',
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 6,
  },
  tabBtn: {
    flex: 1,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  tabText: {
    color: 'rgba(251,249,244,0.55)',
    fontWeight: '700',
    fontSize: 13.5,
  },
  tabTextActive: {
    color: '#FBF9F4',
  },
  addBtn: {
    width: 52,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#83E0CE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: 25,
    fontWeight: '600',
    color: '#053C33',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FBF9F4',
    borderRadius: 20,
    padding: 18,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#14201C',
    marginBottom: 12,
  },
  periodOption: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 6,
  },
  periodOptionActive: {
    backgroundColor: '#0D6E5E',
  },
  periodOptionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#14201C',
  },
  periodOptionTextActive: {
    color: '#EAF6F2',
  },
});