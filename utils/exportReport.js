import { Alert, Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { buildDocxBytes } from './docxBuilder';

// Single source of truth for column labels/order and relative widths, shared
// between the PDF (HTML) and Word (OOXML) table builders so both exports
// line up with the reference layout.
const COLUMNS = [
  { key: 'date', label: 'Date', pct: 14 },
  { key: 'fasting', label: 'Fasting', pct: 10 },
  { key: 'beforeLunch', label: 'Before Lunch', pct: 11 },
  { key: 'afterLunch', label: 'After Lunch', pct: 11 },
  { key: 'beforeDinner', label: 'Before Dinner', pct: 11 },
  { key: 'afterDinner', label: 'After Dinner', pct: 12 },
  { key: 'threeAm', label: '3 AM', pct: 9 },
  { key: 'otherText', label: 'Other', pct: 15 },
  { key: 'unitText', label: 'Unit', pct: 7 },
];

const ROWS_PER_PAGE = 28;

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
    .sort((a, b) => b.localeCompare(a))
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
  const colgroup = `<colgroup>${COLUMNS.map((c) => `<col style="width:${c.pct}%;">`).join('')}</colgroup>`;
  const headerRow = `<tr>${COLUMNS.map((c) => `<th>${c.label}</th>`).join('')}</tr>`;

  const pageCount = Math.max(1, Math.ceil(rows.length / ROWS_PER_PAGE));
  const pages = [];
  for (let p = 0; p < pageCount; p++) {
    const pageRows = rows.slice(p * ROWS_PER_PAGE, (p + 1) * ROWS_PER_PAGE);
    const bodyRows = pageRows.length
      ? pageRows
          .map(
            (r) => `<tr>${COLUMNS.map(
              (c) => `<td${c.key === 'date' ? ' style="font-weight:bold;"' : ''}>${r[c.key]}</td>`
            ).join('')}</tr>`
          )
          .join('')
      : `<tr><td colspan="${COLUMNS.length}">No records for this period.</td></tr>`;

    pages.push(`
      <div class="page">
        <table>
          ${colgroup}
          <thead>${headerRow}</thead>
          <tbody>${bodyRows}</tbody>
        </table>
        <div class="pageNumber">${p + 1}</div>
      </div>`);
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          body { font-family: Arial, sans-serif; margin: 0; color: #000; }
          .page { page-break-after: always; }
          .page:last-child { page-break-after: auto; }
          table { width: 100%; border-collapse: collapse; border: 2px solid #000; table-layout: fixed; }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; }
          th, td { border: 1.5px solid #000; padding: 8px 4px; text-align: center; vertical-align: middle; font-size: 14px; word-wrap: break-word; }
          th { font-weight: bold; background-color: #f3f3f3; }
          .pageNumber { text-align: center; font-size: 12px; margin-top: 8px; page-break-inside: avoid; }
        </style>
      </head>
      <body>
        ${pages.join('')}
      </body>
    </html>
  `;
};

export const exportLogsToPDF = async (entries, startDate, endDate) => {
  const rows = buildExportMatrix(entries, startDate, endDate);
  const html = buildTableHtml(rows);

  try {
    // A4 in points (matches the @page size above) so the actual generated
    // PDF page dimensions line up with the CSS pagination math.
    const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    return true;
  } catch (error) {
    Alert.alert('PDF Error', 'Unable to generate PDF file.');
    return false;
  }
};

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// A4 page width (11906 dxa) minus 720-dxa left/right margins = 10466 dxa
// of usable width, split across columns using the same ratios as the PDF.
const PAGE_USABLE_WIDTH_DXA = 10466;
const COLUMN_WIDTHS_DXA = COLUMNS.map((c) => Math.round((PAGE_USABLE_WIDTH_DXA * c.pct) / 100));

export const exportLogsToDOCX = async (entries, startDate, endDate) => {
  const matrix = buildExportMatrix(entries, startDate, endDate);
  const headers = COLUMNS.map((c) => c.label);
  const rows = matrix.map((r) => COLUMNS.map((c) => r[c.key]));
  const fileName = `Glucose_Logs_${startDate}_to_${endDate}.docx`;

  try {
    const bytes = buildDocxBytes({ headers, rows, columnWidths: COLUMN_WIDTHS_DXA });

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
