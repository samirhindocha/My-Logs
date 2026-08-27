import React, { useState } from 'react';
import { StyleSheet, Text, View, Modal, TextInput, TouchableOpacity } from 'react-native';

export default function ExportModal({ visible, onClose, onExportPDF, onExportDOCX }) {
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
            <Text style={styles.modalTitle}>Export Logs</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSub}>
            Select date range period (YYYY-MM-DD) to export the table report.
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

          {/* Export Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.exportBtn, styles.pdfBtn]}
              onPress={() => onExportPDF(startDate, endDate)}
            >
              <Text style={styles.exportBtnText}>Export .PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.exportBtn, styles.docxBtn]}
              onPress={() => onExportDOCX(startDate, endDate)}
            >
              <Text style={styles.exportBtnText}>Export .DOCX</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,32,28,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FBF9F4',
    borderRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#14201C',
  },
  modalClose: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8B9A94',
  },
  modalSub: {
    fontSize: 12,
    color: '#6B7A75',
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B9A94',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(20,32,28,0.15)',
    borderRadius: 12,
    padding: 10,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  exportBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfBtn: {
    backgroundColor: '#0D6E5E',
  },
  docxBtn: {
    backgroundColor: '#2563EB',
  },
  exportBtnText: {
    color: '#EAF6F2',
    fontWeight: '700',
    fontSize: 13.5,
  },
});