import { Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export const exportLogsToPDF = async (entries, startDate, endDate) => {
  const filtered = entries.filter((e) => e.date >= startDate && e.date <= endDate);

  const rowsHtml = filtered
    .map(
      (e) => `
      <tr>
        <td>${e.date}</td>
        <td>${e.time || '—'}</td>
        <td>${e.category}</td>
        <td>${e.title}</td>
        <td>${e.value ? `${e.value} ${e.unit || ''}`.trim() : '—'}</td>
      </tr>`
    )
    .join('');

  const htmlContent = `
    <html>
      <head>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 24px; color: #14201C; }
          h1 { color: #0D6E5E; margin-bottom: 4px; }
          p { margin: 4px 0; color: #6B7A75; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #0D6E5E; color: white; text-align: left; padding: 10px; font-size: 12px; }
          td { border-bottom: 1px solid #E5E7EB; padding: 10px; font-size: 12px; }
          tr:nth-child(even) { background-color: #F9FAFB; }
        </style>
      </head>
      <body>
        <h1>My Logs — Activity Report</h1>
        <p><strong>Period:</strong> ${startDate} to ${endDate}</p>
        <p><strong>Total Logs:</strong> ${filtered.length}</p>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Category</th>
              <th>Description</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="5" style="text-align:center;">No logs recorded in this period.</td></tr>'}
          </tbody>
        </table>
      </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    return true;
  } catch (error) {
    Alert.alert('Export Failed', 'Could not generate PDF report.');
    return false;
  }
};