import { Alert, Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { buildDocxBytes } from './docxBuilder';

const formatShortDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}-${month}-${year.slice(-2)}`;
};

const buildExportMatrix = (entries, startDate, endDate) => {
  // Exclude logs marked as hidden
  const filtered = entries.filter(
    (e) => !e.hidden && e.date >= startDate && e.date <= endDate
  );
  const byDate = {};

  filtered.forEach((item) => {
    if (!byDate[item.date]) {
      byDate[item.date] = {
        date: formatShortDate(item.date),
        fasting: '',
        beforeLunch: '',
        afterLunch: '',
        beforeDinner: '',
        afterDinner: '',
        threeAm: '',
        other: [],
        am: '',
        pm: '',
        extra: '',
      };
    }

    const row = byDate[item.date];

    if (item.am) row.am = item.am;
    if (item.pm) row.pm = item.pm;
    if (item.extra) row.extra = item.extra;

    const valDisplay = item.reading ? String(item.reading) : '';

    switch (item.slot) {
      case 'Fasting':
        row.fasting = valDisplay;
        break;
      case 'Before Lunch':
        row.beforeLunch = valDisplay;
        break;
      case 'After Lunch 2hr':
      case 'After Lunch':
        row.afterLunch = valDisplay;
        break;
      case 'Before Dinner':
        row.beforeDinner = valDisplay;
        break;
      case 'After Dinner':
        row.afterDinner = valDisplay;
        break;
      case '3 AM':
        row.threeAm = valDisplay;
        break;
      default:
        if (valDisplay) {
          const timeTag = item.time ? item.time.replace(/\s+/g, '') : '';
          row.other.push(timeTag ? `${timeTag} - ${valDisplay}` : valDisplay);
        }
        break;
    }
  });

  return Object.keys(byDate)
    .sort((a, b) => a.localeCompare(b))
    .map((d) => {
      const r = byDate[d];
      const units = [];
      if (r.am) units.push(r.am);
      if (r.pm) units.push(r.pm);
      if (r.extra) units.push(r.extra);
      return {
        ...r,
        otherText: r.other.join(', '),
        unitText: units.join(' / ') || '—',
      };
    });
};

const buildTableHtml = (rows) => {
  const tableRows = rows
    .map(
      (r) => `
      <tr>
        <td style="font-weight:bold;">${r.date}</td>
        <td>${r.fasting}</td>
        <td>${r.beforeLunch}</td>
        <td>${r.afterLunch}</td>
        <td>${r.beforeDinner}</td>
        <td>${r.afterDinner}</td>
        <td>${r.threeAm}</td>
        <td>${r.otherText}</td>
        <td>${r.unitText}</td>
      </tr>`
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page { size: portrait; margin: 10mm; }
          body { font-family: Arial, sans-serif; padding: 10px; color: #000; }
          table { width: 100%; border-collapse: collapse; border: 2px solid #000; table-layout: fixed; }
          th, td { border: 1.5px solid #000; padding: 4px 3px; text-align: center; font-size: 9px; word-wrap: break-word; }
          th { font-weight: bold; font-size: 10px; background-color: #f3f3f3; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Fasting</th>
              <th>Before Lunch</th>
              <th>After Lunch</th>
              <th>Before Dinner</th>
              <th>After Dinner</th>
              <th>3 AM</th>
              <th>Other</th>
              <th>Unit</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || '<tr><td colspan="9">No records for this period.</td></tr>'}
          </tbody>
        </table>
      </body>
    </html>
  `;
};

export const exportLogsToPDF = async (entries, startDate, endDate) => {
  const rows = buildExportMatrix(entries, startDate, endDate);
  const html = buildTableHtml(rows);

  try {
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    return true;
  } catch (error) {
    Alert.alert('PDF Error', 'Unable to generate PDF file.');
    return false;
  }
};

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const exportLogsToDOCX = async (entries, startDate, endDate) => {
  const matrix = buildExportMatrix(entries, startDate, endDate);
  const headers = ['Date', 'Fasting', 'Before Lunch', 'After Lunch', 'Before Dinner', 'After Dinner', '3 AM', 'Other', 'Unit'];
  const rows = matrix.map((r) => [
    r.date,
    r.fasting,
    r.beforeLunch,
    r.afterLunch,
    r.beforeDinner,
    r.afterDinner,
    r.threeAm,
    r.otherText,
    r.unitText,
  ]);
  const fileName = `Glucose_Logs_${startDate}_to_${endDate}.docx`;

  try {
    const bytes = buildDocxBytes({ title: 'Glucose Logs Export', headers, rows });

    if (Platform.OS === 'web') {
      const blob = new Blob([bytes], { type: DOCX_MIME });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      return true;
    }

    const file = new File(Paths.cache, fileName);
    if (file.exists) file.delete();
    file.write(bytes);
    await Sharing.shareAsync(file.uri, {
      UTI: 'org.openxmlformats.wordprocessingml.document',
      mimeType: DOCX_MIME,
    });
    return true;
  } catch (error) {
    Alert.alert('Word Export Error', 'Unable to export Word document.');
    return false;
  }
};