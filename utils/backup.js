// Full encrypted backup/restore of everything the app persists: log entries,
// app config (reminder settings + slot time windows), and the mySugr import
// cutoff marker. The backup file is a password-protected JSON envelope —
// anyone who doesn't have the password sees only opaque ciphertext.
import CryptoJS from 'crypto-js';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';

const BACKUP_MAGIC = 'my-logs-backup';
const BACKUP_FORMAT_VERSION = 1;

// PBKDF2-derived key + random salt/IV per backup, rather than crypto-js's
// convenience password mode (single-round MD5 key derivation) — this is the
// standard, brute-force-resistant way to turn a user password into an AES key.
const SALT_BYTES = 16;
const IV_BYTES = 16;
const KEY_SIZE_WORDS = 256 / 32;
const PBKDF2_ITERATIONS = 10000;

const pad2 = (n) => String(n).padStart(2, '0');

const buildBackupFileName = () => {
  const d = new Date();
  return `MyLogs_Backup_${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}.mlbackup`;
};

const deriveKey = (password, salt, iterations = PBKDF2_ITERATIONS) =>
  CryptoJS.PBKDF2(password, salt, { keySize: KEY_SIZE_WORDS, iterations });

// Encrypts { entries, config, mysugrCutoff } into a password-protected backup
// file and opens the share sheet so the user can save it wherever they like.
export const exportEncryptedBackup = async ({ entries, config, mysugrCutoff, password }) => {
  const payload = JSON.stringify({
    version: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    entries,
    config,
    mysugrCutoff: mysugrCutoff || null,
  });

  const salt = CryptoJS.lib.WordArray.random(SALT_BYTES);
  const iv = CryptoJS.lib.WordArray.random(IV_BYTES);
  const key = deriveKey(password, salt);

  const encrypted = CryptoJS.AES.encrypt(payload, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  const envelope = JSON.stringify({
    magic: BACKUP_MAGIC,
    version: BACKUP_FORMAT_VERSION,
    salt: salt.toString(CryptoJS.enc.Hex),
    iv: iv.toString(CryptoJS.enc.Hex),
    iterations: PBKDF2_ITERATIONS,
    ciphertext: encrypted.toString(),
  });

  const file = new File(Paths.cache, buildBackupFileName());
  if (file.exists) file.delete();
  file.write(envelope);

  await Sharing.shareAsync(file.uri, {
    UTI: 'public.json',
    mimeType: 'application/json',
  });
};

// Lets the user pick a .mlbackup file and decrypts it with the given password.
// Returns null if the user cancelled the picker, or throws a user-facing
// Error if the file isn't a My Logs backup or the password is wrong.
export const pickAndDecryptBackup = async (password) => {
  const picked = await DocumentPicker.getDocumentAsync({ type: '*/*' });
  if (picked.canceled || !picked.assets || !picked.assets.length) return null;

  const raw = await new File(picked.assets[0].uri).text();

  let envelope;
  try {
    envelope = JSON.parse(raw);
  } catch {
    throw new Error("This doesn't look like a My Logs backup file.");
  }
  if (envelope.magic !== BACKUP_MAGIC || !envelope.ciphertext || !envelope.salt || !envelope.iv) {
    throw new Error("This doesn't look like a My Logs backup file.");
  }

  const salt = CryptoJS.enc.Hex.parse(envelope.salt);
  const iv = CryptoJS.enc.Hex.parse(envelope.iv);
  const key = deriveKey(password, salt, envelope.iterations || PBKDF2_ITERATIONS);

  let decrypted = '';
  try {
    decrypted = CryptoJS.AES.decrypt(envelope.ciphertext, key, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }).toString(CryptoJS.enc.Utf8);
  } catch {
    decrypted = '';
  }
  if (!decrypted) {
    throw new Error('Incorrect password or corrupted backup file.');
  }

  let payload;
  try {
    payload = JSON.parse(decrypted);
  } catch {
    throw new Error('Incorrect password or corrupted backup file.');
  }

  if (!Array.isArray(payload.entries)) {
    throw new Error('Backup file is missing log data.');
  }

  return payload;
};
