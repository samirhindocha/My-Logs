import React, { useState } from 'react';
import { StyleSheet, Text, View, Modal, TextInput, TouchableOpacity } from 'react-native';

export default function ExportModal({ visible, onClose, onExport }) {
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Export PDF Report</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSub}>
            Choose date range period (YYYY-MM-DD) for your PDF report.
          </Text>

          <Text style={styles.fieldLabel}>Start Date</Text>
          <TextInput
            style={styles.modalInput}
            value={startDate}
            placeholder="YYYY-MM-DD"
            onChangeText={setStartDate}
          />

          <Text style={styles.fieldLabel}>End Date</Text>
          <TextInput
            style={styles.modalInput}
            value={endDate}
            placeholder="YYYY-MM-DD"
            onChangeText={setEndDate}
          />

          <TouchableOpacity
            style={styles.exportSubmitBtn}
            onPress={() => onExport(startDate, endDate)}
          >
            <Text style={styles.exportSubmitText}>Generate & Share PDF</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(20,32,28,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%', backgroundColor: '#FBF9F4', borderRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#14201C' },
  modalClose: { fontSize: 18, fontWeight: '700', color: '#8B9A94' },
  modalSub: { fontSize: 12, color: '#6B7A75', marginBottom: 16 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#8B9A94', textTransform: 'uppercase', marginBottom: 4 },
  modalInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(20,32,28,0.15)', borderRadius: 12, padding: 10, fontSize: 14, fontWeight: '600', marginBottom: 12 },
  exportSubmitBtn: { backgroundColor: '#0D6E5E', height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  exportSubmitText: { color: '#EAF6F2', fontWeight: '700', fontSize: 14 },
});