export const STORAGE_KEY = '@my_logs_glucose_data';

export const SLOTS = [
  { name: 'Fasting', time: '6:30 AM' },
  { name: 'Before Lunch', time: '12:30 PM' },
  { name: 'After Lunch 2hr', time: '2:30 PM' },
  { name: 'Before Dinner', time: '7:30 PM' },
  { name: 'After Dinner', time: '9:30 PM' },
  { name: '3 AM', time: '3:00 AM' },
  { name: 'Custom', time: 'Set time' },
];

export const INITIAL_DATA = [
  { id: '1', date: new Date().toISOString().split('T')[0], slot: 'Fasting', time: '6:30 AM', reading: 118, am: '14', pm: '' },
  { id: '2', date: new Date().toISOString().split('T')[0], slot: 'After Lunch 2hr', time: '2:30 PM', reading: 164, am: '', pm: '' },
];