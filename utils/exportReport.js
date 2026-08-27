import { Alert, Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// Format YYYY-MM-DD to DD-MM-YY
const formatShortDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}-${month}-${year.slice(-2)}`;
};

// Transform raw log entries into single-row date grids
const buildExportMatrix = (entries, startDate, endDate) => {
  const filtered = entries.filter((e) => e.date >= startDate && e.date <= endDate);
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
      };
    }

    const row = byDate[item.date];

    // Insulin Units (AM - PM)
    if (item.am) row.am = item.am;
    if (item.pm) row.pm = item.pm;

    // Slot Mapping
    switch (item.slot) {
      case 'Fasting':
        row.fasting = item.reading ? String(item.reading) : '';
        break;
      case 'Before Lunch':
        row.beforeLunch = item.reading ? String(item.reading) : '';
        break;
      case 'After Lunch 2hr':
      case 'After Lunch':
        row.afterLunch = item.reading ? String(item.reading) : '';
        break;
      case 'Before Dinner':
        row.beforeDinner = item.reading ? String(item.reading) : '';
        break;
      case 'After Dinner':
        row.afterDinner = item.reading ? String(item.reading) : '';
        break;
      case '3 AM':
        row.threeAm = item.reading ? String(item.reading) : '';
        break;
      default:
        if (item.reading) {
          const timeTag = item.time ? item.time.replace(/\s+/g, '') : '';
          row.other.push(timeTag ? `${timeTag} - ${item.reading}` : `${item.reading}`);
        }
        break;
    }
  });

  // Sort chronologically ascending
  return Object.keys(byDate)
    .sort((a, b) => a.localeCompare(b))
    .map((d) => {
      const r = byDate[d];
      let unitText = '';
      if (r.am || r.pm) {
        unitText = `${r.am || '0'}-${r.pm || '0'}`;
      }
      return {
        ...r,
        otherText: r.other.join(', '),
        unitText,
      };
    });
};

// Generate HTML representation matching the exact border-grid style
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
          @page { size: landscape; margin: 15mm; }
          body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 20px; color: #000; }
          table { width: 100%; border-collapse: collapse; border: 2px solid #000; margin-top: 10px; }
          th, td { border: 1.5px solid #000; padding: 10px 8px; text-align: center; font-size: 15px; min-height: 36px; }
          th { font-weight: bold; font-size: 16px; background-color: #ffffff; }
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
            ${tableRows || '<tr><td colspan="9" style="padding:20px;">No logs recorded for this period.</td></tr>'}
          </tbody>
        </table>
      </body>
    </html>
  `;
};

// 1. Export as PDF
export const exportLogsToPDF = async (entries, startDate, endDate) => {
  const rows = buildExportMatrix(entries, startDate, endDate);
  const html = buildTableHtml(rows);

  try {
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    return true;
  } catch (error) {
    Alert.alert('PDF Export Error', 'Unable to generate PDF document.');
    return false;
  }
};

// 2. Export as DOCX (Web & Mobile compatible without expo-file-system)
export const exportLogsToDOCX = async (entries, startDate, endDate) => {
  const rows = buildExportMatrix(entries, startDate, endDate);
  const html = buildTableHtml(rows);

  const docContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
      </head>
      ${html}
    </html>
  `;

  try {
    if (Platform.OS === 'web') {
      const blob = new Blob([docContent], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Glucose_Logs_${startDate}_to_${endDate}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      return true;
    }

    // On native devices, share the document URI directly
    const { uri } = await Print.printToFileAsync({ html: docContent });
    await Sharing.shareAsync(uri, {
      UTI: 'com.microsoft.word.doc',
      mimeType: 'application/msword',
    });
    return true;
  } catch (error) {
    Alert.alert('DOCX Export Error', 'Unable to generate DOCX document.');
    return false;
  }
};