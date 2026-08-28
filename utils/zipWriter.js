// Minimal ZIP (stored/no-compression) writer.
// Enough to build a valid OOXML (.docx) package without a native/binary dependency.

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

const crc32 = (bytes) => {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

export const utf8Encode = (str) => {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.codePointAt(i);
    if (code > 0xffff) i++; // consume the low surrogate of a surrogate pair
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      );
    }
  }
  return new Uint8Array(bytes);
};

const writeUint16 = (arr, offset, value) => {
  arr[offset] = value & 0xff;
  arr[offset + 1] = (value >> 8) & 0xff;
};

const writeUint32 = (arr, offset, value) => {
  arr[offset] = value & 0xff;
  arr[offset + 1] = (value >> 8) & 0xff;
  arr[offset + 2] = (value >> 16) & 0xff;
  arr[offset + 3] = (value >> 24) & 0xff;
};

// files: Array<{ name: string, data: Uint8Array }>
export const createZip = (files) => {
  const localChunks = [];
  const centralChunks = [];
  let offset = 0;

  files.forEach(({ name, data }) => {
    const nameBytes = utf8Encode(name);
    const crc = crc32(data);
    const size = data.length;

    const localHeader = new Uint8Array(30 + nameBytes.length);
    writeUint32(localHeader, 0, 0x04034b50);
    writeUint16(localHeader, 4, 20);
    writeUint16(localHeader, 6, 0);
    writeUint16(localHeader, 8, 0); // stored, no compression
    writeUint16(localHeader, 10, 0);
    writeUint16(localHeader, 12, 0x21); // 1980-01-01
    writeUint32(localHeader, 14, crc);
    writeUint32(localHeader, 18, size);
    writeUint32(localHeader, 22, size);
    writeUint16(localHeader, 26, nameBytes.length);
    writeUint16(localHeader, 28, 0);
    localHeader.set(nameBytes, 30);

    localChunks.push(localHeader, data);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    writeUint32(centralHeader, 0, 0x02014b50);
    writeUint16(centralHeader, 4, 20);
    writeUint16(centralHeader, 6, 20);
    writeUint16(centralHeader, 8, 0);
    writeUint16(centralHeader, 10, 0);
    writeUint16(centralHeader, 12, 0);
    writeUint16(centralHeader, 14, 0x21);
    writeUint32(centralHeader, 16, crc);
    writeUint32(centralHeader, 20, size);
    writeUint32(centralHeader, 24, size);
    writeUint16(centralHeader, 28, nameBytes.length);
    writeUint16(centralHeader, 30, 0);
    writeUint16(centralHeader, 32, 0);
    writeUint16(centralHeader, 34, 0);
    writeUint16(centralHeader, 36, 0);
    writeUint32(centralHeader, 38, 0);
    writeUint32(centralHeader, 42, offset);
    centralHeader.set(nameBytes, 46);

    centralChunks.push(centralHeader);

    offset += localHeader.length + data.length;
  });

  const centralOffset = offset;
  const centralSize = centralChunks.reduce((acc, c) => acc + c.length, 0);

  const endRecord = new Uint8Array(22);
  writeUint32(endRecord, 0, 0x06054b50);
  writeUint16(endRecord, 4, 0);
  writeUint16(endRecord, 6, 0);
  writeUint16(endRecord, 8, files.length);
  writeUint16(endRecord, 10, files.length);
  writeUint32(endRecord, 12, centralSize);
  writeUint32(endRecord, 16, centralOffset);
  writeUint16(endRecord, 20, 0);

  const total = new Uint8Array(centralOffset + centralSize + endRecord.length);
  let pos = 0;
  [...localChunks, ...centralChunks, endRecord].forEach((chunk) => {
    total.set(chunk, pos);
    pos += chunk.length;
  });

  return total;
};
