import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEY } from '../constants/theme';

export const getStoredEntries = async () => {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (err) {
    console.error('Storage read error', err);
    return [];
  }
};

export const saveStoredEntries = async (data) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Storage write error', err);
  }
};

export const formatDateHeader = (dateStr) => {
  if (!dateStr) return '';
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  
  const parts = dateStr.split('-');
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateDisplay = (dateObj) => {
  if (!dateObj) return '';
  const today = new Date();
  const isToday =
    dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear();

  const formatted = dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return isToday ? `Today · ${formatted}` : formatted;
};

export const getReadingStatus = (value, isExtremeLow, isExtremeHigh) => {
  if (isExtremeLow) return { text: 'EXTREME LOW', color: '#881337', bg: '#FFE4E6' };
  if (isExtremeHigh) return { text: 'EXTREME HIGH', color: '#7F1D1D', bg: '#FEE2E2' };
  if (!value || isNaN(value)) return { text: 'ENTER A VALUE', color: '#8B9A94', bg: '#F0EDE5' };
  const num = parseFloat(value);
  if (num < 70) return { text: 'LOW', color: '#B4741C', bg: '#FBEBD3' };
  if (num > 140) return { text: 'HIGH', color: '#B3402E', bg: '#FAE2DD' };
  return { text: 'IN RANGE', color: '#0D6E5E', bg: '#DCEDE8' };
};