import React, { useState, useEffect } from 'react';
import { StyleSheet, SafeAreaView, StatusBar, Platform, View, ActivityIndicator, BackHandler, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import LogbookView from './components/LogbookView';
import TrendsView from './components/TrendsView';
import NewEntryView from './components/NewEntryView';
import ExportModal from './components/ExportModal';
import ConfigModal from './components/ConfigModal';
import { getStoredEntries, saveStoredEntries } from './utils/storage';
import { exportLogsToPDF, exportLogsToDOCX } from './utils/exportReport';
import { parseMySugrCsv } from './utils/mySugrImport';
import {
  CONFIG_STORAGE_KEY,
  DEFAULT_CONFIG,
  setupNotifications,
  checkReminders,
  sendTestNotification,
} from './utils/notifications';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [view, setView] = useState('log');
  const [entries, setEntries] = useState([]);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        const notificationsGranted = await setupNotifications();
        if (!notificationsGranted) {
          Alert.alert(
            'Notifications Disabled',
            'Reminder notifications won\'t show up because notification permission was not granted. Enable it for this app in your device Settings if you want reminders.'
          );
        }

        const loadedEntries = await getStoredEntries();
        if (isMounted) setEntries(loadedEntries || []);

        const savedCfg = await AsyncStorage.getItem(CONFIG_STORAGE_KEY);
        const parsedCfg = savedCfg ? JSON.parse(savedCfg) : DEFAULT_CONFIG;
        if (isMounted) setConfig(parsedCfg);

        // Check reminders safely inside state lifecycle
        setTimeout(() => {
          checkReminders(loadedEntries || [], parsedCfg);
        }, 1200);
      } catch (err) {
        console.warn('Bootstrap warning:', err);
      } finally {
        if (isMounted) setIsReady(true);
      }
    };

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const onBackPress = () => {
      if (isExportOpen) {
        setIsExportOpen(false);
        return true;
      }
      if (isConfigOpen) {
        setIsConfigOpen(false);
        return true;
      }
      if (view === 'entry' || view === 'trends') {
        setView('log');
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [view, isExportOpen, isConfigOpen]);

  const handleSaveConfig = async (newConfig) => {
    try {
      setConfig(newConfig);
      await AsyncStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
      checkReminders(entries, newConfig);
    } catch (err) {
      console.warn('Config save error:', err);
    }
  };

  const handleSaveEntry = async (newEntry) => {
    try {
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
      setEditingEntry(null);
      setView('log');
    } catch (err) {
      console.warn('Entry save error:', err);
    }
  };

  const handleDeleteEntry = async (id) => {
    try {
      const updated = entries.filter((e) => e.id !== id);
      setEntries(updated);
      await saveStoredEntries(updated);
    } catch (err) {
      console.warn('Delete error:', err);
    }
  };

  const handleToggleHideEntry = async (id) => {
    try {
      const updated = entries.map((e) => (e.id === id ? { ...e, hidden: !e.hidden } : e));
      setEntries(updated);
      await saveStoredEntries(updated);
    } catch (err) {
      console.warn('Toggle hide error:', err);
    }
  };

  const handleExportPDF = async (startDate, endDate) => {
    const success = await exportLogsToPDF(entries, startDate, endDate);
    if (success) setIsExportOpen(false);
  };

  const handleExportDOCX = async (startDate, endDate) => {
    const success = await exportLogsToDOCX(entries, startDate, endDate);
    if (success) setIsExportOpen(false);
  };

  const handleImportMySugr = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: '*/*' });
      if (picked.canceled || !picked.assets || !picked.assets.length) return;

      const csvText = await new File(picked.assets[0].uri).text();
      const { entries: parsed, skipped } = parseMySugrCsv(csvText, config.slotTimeWindows);

      if (!parsed.length) {
        Alert.alert('Import Failed', 'Could not find any readings in that file. Make sure it\'s a mySugr CSV export.');
        return;
      }

      const existingKeys = new Set(entries.map((e) => `${e.date}|${e.time}|${e.reading}`));
      const now = Date.now();
      const newEntries = [];
      let duplicates = 0;

      parsed.forEach((entry, index) => {
        const key = `${entry.date}|${entry.time}|${entry.reading}`;
        if (existingKeys.has(key)) {
          duplicates++;
          return;
        }
        existingKeys.add(key);
        newEntries.push({ ...entry, id: `mysugr_${now}_${index}` });
      });

      if (newEntries.length > 0) {
        const updated = [...newEntries, ...entries];
        setEntries(updated);
        await saveStoredEntries(updated);
      }

      Alert.alert(
        'Import Complete',
        `Imported ${newEntries.length} new reading${newEntries.length === 1 ? '' : 's'}.` +
          (duplicates ? `\n${duplicates} already imported (skipped).` : '') +
          (skipped ? `\n${skipped} row${skipped === 1 ? '' : 's'} could not be read.` : '') +
          `\n\nMeal-time slots were guessed from time of day — review and adjust any that look wrong.`
      );
    } catch (err) {
      console.warn('mySugr import error:', err);
      Alert.alert('Import Failed', 'Could not read that file.');
    }
  };

  const handleSendTestNotification = async () => {
    await sendTestNotification();
    Alert.alert('Test Sent', 'Check your notification panel now. If nothing shows up, notification permission is likely blocked in your device Settings for this app.');
  };

  const handleCheckRemindersNow = async () => {
    const result = await checkReminders(entries, config);
    Alert.alert(
      result?.fired ? 'Reminder Sent' : 'No Reminder Due',
      result?.reason || 'Unknown.'
    );
  };

  const handleTrendsExportPDF = async (days) => {
    const end = new Date().toISOString().split('T')[0];
    const startObj = new Date();
    startObj.setDate(startObj.getDate() - days);
    const start = startObj.toISOString().split('T')[0];
    await exportLogsToPDF(entries, start, end);
  };

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0D6E5E" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FBF9F4" />

      {view === 'log' && (
        <LogbookView
          entries={entries}
          onOpenExport={() => setIsExportOpen(true)}
          onOpenConfig={() => setIsConfigOpen(true)}
          onGoTrends={() => setView('trends')}
          onOpenEntry={() => {
            setEditingEntry(null);
            setView('entry');
          }}
          onEditEntry={(item) => {
            setEditingEntry(item);
            setView('entry');
          }}
          onDeleteEntry={handleDeleteEntry}
          onToggleHideEntry={handleToggleHideEntry}
        />
      )}

      {view === 'trends' && (
        <TrendsView
          entries={entries}
          onExportPDF={handleTrendsExportPDF}
          onGoLog={() => setView('log')}
          onGoEntry={() => {
            setEditingEntry(null);
            setView('entry');
          }}
        />
      )}

      {view === 'entry' && (
        <NewEntryView
          existingEntries={entries}
          editingEntry={editingEntry}
          onSave={handleSaveEntry}
          onCancel={() => {
            setEditingEntry(null);
            setView('log');
          }}
          onImportMySugr={handleImportMySugr}
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
        onSendTestNotification={handleSendTestNotification}
        onCheckRemindersNow={handleCheckRemindersNow}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF9F4',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FBF9F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
});