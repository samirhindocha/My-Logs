// Imports a mySugr "Export as CSV" file into this app's entry format.
//
// mySugr logs a raw date+time+value per reading with no meal-time tag, while
// this app organizes entries by meal slot (Fasting, Before Lunch, ...). Since
// there's no reliable tag to go on, the slot is *guessed* from a set of narrow,
// user-configurable time-of-day windows; anything outside those windows is left
// as "Custom" — callers should tell the user these are best-effort guesses.
import { SLOTS } from '../constants/theme';

const CORE_SLOT_NAMES = SLOTS.filter((s) => s.name !== 'Custom').map((s) => s.name);

export const DEFAULT_SLOT_TIME_WINDOWS = {
  Fasting: { start: '07:00', end: '10:00' },
  'Before Lunch': { start: '12:00', end: '14:00' },
  'After Lunch 2hr': { start: '14:00', end: '17:30' },
  'Before Dinner': { start: '20:30', end: '22:00' },
  'After Dinner': { start: '23:00', end: '00:30' },
  '3 AM': { start: '02:30', end: '03:30' },
};

const MONTHS = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

// Generic RFC4180-ish CSV parser: handles quoted fields, embedded commas,
// escaped ("") quotes, and both \n and \r\n line endings.
const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1 || r[0] !== '');
};

// "Aug 30, 2026" -> "2026-08-30". Parsed manually (no Date object) so a
// device timezone offset can never shift the date by a day.
const parseMySugrDate = (str) => {
  const match = (str || '').trim().match(/^([A-Za-z]{3})[a-z]*\s+(\d{1,2}),?\s+(\d{4})$/);
  if (!match) return null;
  const month = MONTHS[match[1].toLowerCase()];
  if (!month) return null;
  const day = match[2].padStart(2, '0');
  return `${match[3]}-${month}-${day}`;
};

// "9:42:03 AM" -> { display: "9:42 AM", totalMinutes: 582 (minutes since midnight) }
const parseMySugrTime = (str) => {
  const match = (str || '').trim().match(/^(\d{1,2}):(\d{2}):\d{2}\s*(AM|PM)$/i);
  if (!match) return null;
  const hour12 = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  const hour24 = (hour12 % 12) + (period === 'PM' ? 12 : 0);
  return { display: `${hour12}:${match[2]} ${period}`, totalMinutes: hour24 * 60 + minute };
};

// "07:00" -> 420 (minutes since midnight)
const parseHHMM = (str) => {
  const match = (str || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
};

const inWindow = (t, startMinutes, endMinutes) => {
  if (startMinutes <= endMinutes) return t >= startMinutes && t < endMinutes;
  return t >= startMinutes || t < endMinutes; // window wraps past midnight
};

// Best-effort meal-slot guess from time of day, using the (possibly user-edited)
// slot time windows. Anything outside every window is left as "Custom".
const guessSlotFromMinutes = (totalMinutes, windows) => {
  for (const slotName of CORE_SLOT_NAMES) {
    const win = windows?.[slotName];
    if (!win) continue;
    const start = parseHHMM(win.start);
    const end = parseHHMM(win.end);
    if (start == null || end == null) continue;
    if (inWindow(totalMinutes, start, end)) return slotName;
  }
  return 'Custom';
};

// Parses a mySugr CSV export into app-ready entry objects.
// Returns { entries, skipped } — skipped counts rows with no usable date/reading.
export const parseMySugrCsv = (csvText, slotTimeWindows = DEFAULT_SLOT_TIME_WINDOWS) => {
  const rows = parseCsv(csvText || '');
  if (rows.length < 2) return { entries: [], skipped: 0 };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const colIndex = (name) => header.indexOf(name.toLowerCase());
  const dateCol = colIndex('Date');
  const timeCol = colIndex('Time');
  const readingCol = colIndex('Blood Sugar Measurement (mg/dL)');

  if (dateCol === -1 || readingCol === -1) return { entries: [], skipped: rows.length - 1 };

  const entries = [];
  let skipped = 0;

  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r];
    const rawReading = (cols[readingCol] || '').trim();
    const reading = parseFloat(rawReading);
    const date = parseMySugrDate(cols[dateCol]);

    if (!rawReading || isNaN(reading) || !date) {
      skipped++;
      continue;
    }

    const time = timeCol >= 0 ? parseMySugrTime(cols[timeCol]) : null;
    const slot = time ? guessSlotFromMinutes(time.totalMinutes, slotTimeWindows) : 'Custom';

    entries.push({
      date,
      time: time ? time.display : '',
      slot,
      reading,
      isExtremeLow: reading < 50,
      isExtremeHigh: reading > 250,
      am: '',
      pm: '',
      extra: '',
      hidden: false,
      source: 'mysugr',
    });
  }

  return { entries, skipped };
};
