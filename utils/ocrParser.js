/**
 * Accu-Chek Instant display parser
 * LCD layout (each item sits on its own visual line/row):
 *   [Time: H:MM or HH:MM]   [Date: DD-M, DD-MM, or DD.MM]
 *                 [ 2-3 digit Value ]
 *                     mg/dL
 *
 * Works line-by-line (rather than one flattened blob) so the reading digits
 * never get confused with the time/date row, and strips trailing OCR noise
 * from the small ">" pointer glyph that sits next to the reading.
 */
export const parseAccuChekDisplay = (input = '') => {
  const result = {
    reading: '',
    time: '',
    date: '',
  };

  if (!input) return result;

  const lines = (Array.isArray(input) ? input : String(input).split(/[\r\n]+/))
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    // Time (e.g. 0:04, 14:30, 23:36)
    if (!result.time) {
      const timeMatch = line.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1], 10);
        const minutes = timeMatch[2];
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 === 0 ? 12 : hours % 12;
        result.time = `${displayHours}:${minutes} ${ampm}`;
      }
    }

    // Date (e.g. 28-8, 28.8, 28/08)
    if (!result.date) {
      const dateMatch = line.match(/\b([0-2]?\d|3[01])[-.\/]([1-9]|0[1-9]|1[0-2])\b/);
      if (dateMatch) {
        const day = dateMatch[1].padStart(2, '0');
        const month = dateMatch[2].padStart(2, '0');
        const currentYear = new Date().getFullYear();
        result.date = `${currentYear}-${month}-${day}`;
      }
    }

    // Glucose reading — sits alone on its own line, sometimes with the small
    // ">" pointer glyph fused onto the end by OCR, so trailing junk is stripped
    // before checking that the whole line is just a 2-3 digit number (40-599).
    if (!result.reading) {
      const strippedLine = line.replace(/[^0-9]+$/, '').trim();
      if (/^([4-9]\d|[1-5]\d{2})$/.test(strippedLine)) {
        result.reading = strippedLine;
      }
    }
  }

  return result;
};
