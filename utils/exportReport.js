import { Alert, Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

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

    const valDisplay = item.isExtremeLow
      ? 'Ext Low (<50)'
      : item.isExtremeHigh
      ? 'Ext High (>250)'
      : item.reading
      ? String(item.reading)
      : '';

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
      if (r.am) units.push(`${r.am} AM`);
      if (r.pm) units.push(`${r.pm} PM`);
      if (r.extra) units.push(`${r.extra} Ext`);
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
          @page { size: landscape; margin: 12mm; }
          body { font-family: Arial, sans-serif; padding: 15px; color: #000; }
          table { width: 100%; border-collapse: collapse; border: 2px solid #000; }
          th, td { border: 1.5px solid #000; padding: 8px 6px; text-align: center; font-size: 13px; }
          th { font-weight: bold; font-size: 14px; background-color: #f3f3f3; }
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

export const exportLogsToDOCX = async (entries, startDate, endDate) => {
  const rows = buildExportMatrix(entries, startDate, endDate);
  const html = buildTableHtml(rows);

  const docContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>Glucose Logs Export</title>
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
      <body>
        ${html}
      </body>
    </html>
  `;

  try {
    if (Platform.OS === 'web') {
      const blob = new Blob(['\ufeff' + docContent], {
        type: 'application/msword;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Glucose_Logs_${startDate}_to_${endDate}.doc`;
      a.click();
      URL.revokeObjectURL(url);
      return true;
    }

    const { uri } = await Print.printToFileAsync({ html: docContent });
    await Sharing.shareAsync(uri, {
      UTI: 'com.microsoft.word.doc',
      mimeType: 'application/msword',
    });
    return true;
  } catch (error) {
    Alert.alert('Word Export Error', 'Unable to export Word document.');
    return false;
  }
};