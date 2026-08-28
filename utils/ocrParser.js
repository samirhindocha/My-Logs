/**
 * Accu-Chek Instant display parser
 * LCD layout:
 *   [Time: H:MM or HH:MM]   [Date: DD-M, DD-MM, or DD.MM]
 *                 [ 3-digit Value ]
 *                     mg/dL
 */
export const parseAccuChekDisplay = (rawText = '') => {
  const result = {
    reading: '',
    time: '',
    date: '',
  };

  if (!rawText) return result;

  // Clean raw string noise
  const clean = rawText.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();

  // 1. Extract 2 to 3 digit glucose reading (40 - 599 mg/dL)
  // Filters out small single digits or common OCR timestamp fragments
  const readingMatch = clean.match(/\b([4-9]\d|[1-5]\d{2})\b(?!\s*[:\.\-])/);
  if (readingMatch) {
    result.reading = readingMatch[1];
  }

  // 2. Extract 24-hour time (e.g. 0:04, 14:30, 9:45)
  const timeMatch = clean.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    result.time = `${displayHours}:${minutes} ${ampm}`;
  }

  // 3. Extract Accu-Chek date layout: DD-M / DD-MM (e.g., 28-8, 28.8, 28/08)
  const dateMatch = clean.match(/\b([0-2]?\d|3[01])[-.\/]([1-9]|0[1-9]|1[0-2])\b/);
  if (dateMatch) {
    const day = dateMatch[1].padStart(2, '0');
    const month = dateMatch[2].padStart(2, '0');
    const currentYear = new Date().getFullYear();
    result.date = `${currentYear}-${month}-${day}`;
  }

  return result;
};