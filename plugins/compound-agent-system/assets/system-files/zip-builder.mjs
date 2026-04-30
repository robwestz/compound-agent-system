const encoder = new TextEncoder();

function crc32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
}

const CRC_TABLE = crc32Table();

function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dosTime(date) {
  return ((date.getHours() & 0x1f) << 11) | ((date.getMinutes() & 0x3f) << 5) | ((date.getSeconds() / 2) & 0x1f);
}

function dosDate(date) {
  return (((date.getFullYear() - 1980) & 0x7f) << 9) | (((date.getMonth() + 1) & 0xf) << 5) | (date.getDate() & 0x1f);
}

function u16(out, n) {
  out.push(n & 0xff, (n >>> 8) & 0xff);
}

function u32(out, n) {
  out.push(n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff);
}

function bytesOf(data) {
  if (data instanceof Uint8Array) return data;
  if (typeof data === "string") return encoder.encode(data);
  return new Uint8Array(data);
}

export function buildZip(files) {
  const local = [];
  const central = [];
  let offset = 0;
  const now = new Date("2026-01-01T00:00:00Z");
  for (const file of files) {
    const name = String(file.name || file.path || "").replaceAll("\\", "/");
    const nameBytes = encoder.encode(name);
    const data = bytesOf(file.data ?? file.content ?? "");
    const crc = crc32(data);
    const localStart = offset;
    const localHeader = [];
    u32(localHeader, 0x04034b50); u16(localHeader, 20); u16(localHeader, 0); u16(localHeader, 0);
    u16(localHeader, dosTime(now)); u16(localHeader, dosDate(now)); u32(localHeader, crc);
    u32(localHeader, data.length); u32(localHeader, data.length); u16(localHeader, nameBytes.length); u16(localHeader, 0);
    local.push(...localHeader, ...nameBytes, ...data);
    offset += localHeader.length + nameBytes.length + data.length;

    const centralHeader = [];
    u32(centralHeader, 0x02014b50); u16(centralHeader, 20); u16(centralHeader, 20); u16(centralHeader, 0); u16(centralHeader, 0);
    u16(centralHeader, dosTime(now)); u16(centralHeader, dosDate(now)); u32(centralHeader, crc);
    u32(centralHeader, data.length); u32(centralHeader, data.length); u16(centralHeader, nameBytes.length); u16(centralHeader, 0); u16(centralHeader, 0);
    u16(centralHeader, 0); u16(centralHeader, 0); u32(centralHeader, 0); u32(centralHeader, localStart);
    central.push(...centralHeader, ...nameBytes);
  }
  const centralOffset = local.length;
  const end = [];
  u32(end, 0x06054b50); u16(end, 0); u16(end, 0); u16(end, files.length); u16(end, files.length);
  u32(end, central.length); u32(end, centralOffset); u16(end, 0);
  return new Uint8Array([...local, ...central, ...end]);
}

function readU16(bytes, pos) {
  return bytes[pos] | (bytes[pos + 1] << 8);
}

function readU32(bytes, pos) {
  return (bytes[pos] | (bytes[pos + 1] << 8) | (bytes[pos + 2] << 16) | (bytes[pos + 3] << 24)) >>> 0;
}

export function parseStoreZip(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const decoder = new TextDecoder();
  const files = [];
  let pos = 0;
  while (pos + 4 <= data.length && readU32(data, pos) === 0x04034b50) {
    const method = readU16(data, pos + 8);
    if (method !== 0) throw new Error(`Unsupported ZIP compression method: ${method}`);
    const compressedSize = readU32(data, pos + 18);
    const uncompressedSize = readU32(data, pos + 22);
    const nameLen = readU16(data, pos + 26);
    const extraLen = readU16(data, pos + 28);
    const nameStart = pos + 30;
    const dataStart = nameStart + nameLen + extraLen;
    const fileData = data.slice(dataStart, dataStart + compressedSize);
    files.push({ name: decoder.decode(data.slice(nameStart, nameStart + nameLen)), data: fileData, size: uncompressedSize });
    pos = dataStart + compressedSize;
  }
  return files;
}
