import React, { useState, useEffect } from 'react';
import { StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import LogbookView from './components/LogbookView';
import TrendsView from './components/TrendsView';
import NewEntryView from './components/NewEntryView';
import ExportModal from './components/ExportModal';
import { getStoredEntries, saveStoredEntries } from './utils/storage';
import { exportLogsToPDF, exportLogsToDOCX } from './utils/exportReport';

export default function App() {
  const [view, setView] = useState('log'); // 'log' | 'trends' | 'entry'
  const [entries, setEntries] = useState([]);
  const [isExportOpen, setIsExportOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const data = await getStoredEntries();
      setEntries(data);
    })();
  }, []);

  const handleSaveEntry = async (newEntry) => {
    const updated = [newEntry, ...entries];
    setEntries(updated);
    await saveStoredEntries(updated);
    setView('log');
  };

  const handleExportPDF = async (startDate, endDate) => {
    const success = await exportLogsToPDF(entries, startDate, endDate);
    if (success) setIsExportOpen(false);
  };

  const handleExportDOCX = async (startDate, endDate) => {
    const success = await exportLogsToDOCX(entries, startDate, endDate);
    if (success) setIsExportOpen(false);
  };

  const handleTrendsExportPDF = async (days) => {
    const end = new Date().toISOString().split('T')[0];
    const startObj = new Date();
    startObj.setDate(startObj.getDate() - days);
    const start = startObj.toISOString().split('T')[0];
    await exportLogsToPDF(entries, start, end);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {view === 'log' && (
        <LogbookView
          entries={entries}
          onOpenExport={() => setIsExportOpen(true)}
          onGoTrends={() => setView('trends')}
          onOpenEntry={() => setView('entry')}
        />
      )}

      {view === 'trends' && (
        <TrendsView
          entries={entries}
          onExportPDF={handleTrendsExportPDF}
          onGoLog={() => setView('log')}
          onGoEntry={() => setView('entry')}
        />
      )}

      {view === 'entry' && (
        <NewEntryView
          onSave={handleSaveEntry}
          onCancel={() => setView('log')}
        />
      )}

      <ExportModal
        visible={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        onExportPDF={handleExportPDF}
        onExportDOCX={handleExportDOCX}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF9F4',
  },
});