// Full backup/restore of everything the app persists: log entries, app config
// (reminder settings + slot time windows), and the mySugr import cutoff marker.
// Plain JSON file — no encryption.
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';

const BACKUP_MAGIC = 'my-logs-backup';
const BACKUP_FORMAT_VERSION = 1;

const pad2 = (n) => String(n).padStart(2, '0');

const buildBackupFileName = () => {
  const d = new Date();
  return `MyLogs_Backup_${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}.json`;
};

// Bundles all persisted data into a JSON backup file and opens the share
// sheet so the user can save it wherever they like.
export const exportBackup = async ({ entries, config, mysugrCutoff }) => {
  const payload = JSON.stringify({
    magic: BACKUP_MAGIC,
    version: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    entries,
    config,
    mysugrCutoff: mysugrCutoff || null,
  });

  const file = new File(Paths.cache, buildBackupFileName());
  if (file.exists) file.delete();
  file.write(payload);

  await Sharing.shareAsync(file.uri, {
    UTI: 'public.json',
    mimeType: 'application/json',
  });
};

// Lets the user pick a backup file and returns its parsed contents. Returns
// null if the user cancelled the picker, or throws a user-facing Error if the
// file isn't a My Logs backup.
export const pickAndReadBackup = async () => {
  const picked = await DocumentPicker.getDocumentAsync({ type: '*/*' });
  if (picked.canceled || !picked.assets || !picked.assets.length) return null;

  const raw = await new File(picked.assets[0].uri).text();

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new Error("This doesn't look like a My Logs backup file.");
  }

  if (payload.magic !== BACKUP_MAGIC || !Array.isArray(payload.entries)) {
    throw new Error("This doesn't look like a My Logs backup file.");
  }

  return payload;
};
