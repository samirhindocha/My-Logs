// Imports a mySugr "Export as CSV" file into this app's entry format.
//
// mySugr logs a raw date+time+value per reading with no meal-time tag, while
// this app organizes entries by meal slot (Fasting, Before Lunch, ...). Since
// there's no reliable tag to go on, the slot is *guessed* from a set of narrow
// time-of-day windows; anything outside those windows is left as "Custom" —
// callers should tell the user these are best-effort guesses, not authoritative.

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

// Best-effort meal-slot guess from time of day — mySugr gives us no real tag to go on.
// Anything outside these windows is left as "Custom" rather than forced into a slot.
const inWindow = (t, startMinutes, endMinutes) => t >= startMinutes && t < endMinutes;

const guessSlotFromMinutes = (totalMinutes) => {
  if (inWindow(totalMinutes, 2 * 60 + 30, 3 * 60 + 30)) return '3 AM'; // 2:30 - 3:30 AM
  if (inWindow(totalMinutes, 7 * 60, 10 * 60)) return 'Fasting'; // 7:00 - 10:00 AM
  if (inWindow(totalMinutes, 12 * 60, 14 * 60)) return 'Before Lunch'; // 12:00 - 2:00 PM
  if (inWindow(totalMinutes, 14 * 60, 17 * 60 + 30)) return 'After Lunch 2hr'; // 2:00 - 5:30 PM
  if (inWindow(totalMinutes, 20 * 60 + 30, 22 * 60)) return 'Before Dinner'; // 8:30 - 10:00 PM
  if (totalMinutes >= 23 * 60 || totalMinutes < 30) return 'After Dinner'; // 11:00 PM - 12:30 AM
  return 'Custom';
};

// Parses a mySugr CSV export into app-ready entry objects.
// Returns { entries, skipped } — skipped counts rows with no usable date/reading.
export const parseMySugrCsv = (csvText) => {
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
    const slot = time ? guessSlotFromMinutes(time.totalMinutes) : 'Custom';

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
    });
  }

  return { entries, skipped };
};
