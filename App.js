import React, { useState, useEffect } from 'react';
import { StyleSheet, SafeAreaView, StatusBar, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LogbookView from './components/LogbookView';
import TrendsView from './components/TrendsView';
import NewEntryView from './components/NewEntryView';
import ExportModal from './components/ExportModal';
import ConfigModal from './components/ConfigModal';
import { getStoredEntries, saveStoredEntries } from './utils/storage';
import { exportLogsToPDF, exportLogsToDOCX } from './utils/exportReport';
import {
  CONFIG_STORAGE_KEY,
  DEFAULT_CONFIG,
  requestNotificationPermission,
  scheduleAllReminders,
} from './utils/notifications';

export default function App() {
  const [view, setView] = useState('log');
  const [entries, setEntries] = useState([]);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  useEffect(() => {
    (async () => {
      await requestNotificationPermission();
      const loadedEntries = await getStoredEntries();
      setEntries(loadedEntries);

      const savedCfg = await AsyncStorage.getItem(CONFIG_STORAGE_KEY);
      const parsedCfg = savedCfg ? JSON.parse(savedCfg) : DEFAULT_CONFIG;
      setConfig(parsedCfg);

      await scheduleAllReminders(loadedEntries, parsedCfg);
    })();
  }, []);

  const handleSaveConfig = async (newConfig) => {
    setConfig(newConfig);
    await AsyncStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    await scheduleAllReminders(entries, newConfig);
  };

  const handleSaveEntry = async (newEntry) => {
    const existsIndex = entries.findIndex((e) => e.id === newEntry.id);
    let updated;
    if (existsIndex >= 0) {
      updated = [...entries];
      updated[existsIndex] = newEntry;
    } else {
      updated = [newEntry, ...entries];
    }
    setEntries(updated);
    await saveStoredEntries(updated);
    await scheduleAllReminders(updated, config);
    setView('log');
  };

  const handleDeleteEntry = async (id) => {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    await saveStoredEntries(updated);
    await scheduleAllReminders(updated, config);
  };

  const handleToggleHideEntry = async (id) => {
    const updated = entries.map((e) => (e.id === id ? { ...e, hidden: !e.hidden } : e));
    setEntries(updated);
    await saveStoredEntries(updated);
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
          onOpenConfig={() => setIsConfigOpen(true)}
          onGoTrends={() => setView('trends')}
          onOpenEntry={() => setView('entry')}
          onDeleteEntry={handleDeleteEntry}
          onToggleHideEntry={handleToggleHideEntry}
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
          existingEntries={entries}
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

      <ConfigModal
        visible={isConfigOpen}
        config={config}
        onClose={() => setIsConfigOpen(false)}
        onSaveConfig={handleSaveConfig}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF9F4',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0,
  },
});