// Generates simple solid PNG app icons (no external deps) so the PWA installs
// cleanly. Draws a dumbbell-ish mark: accent bar on a dark rounded field.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

function png(size) {
  const [bgR, bgG, bgB] = [15, 23, 42];
  const [fgR, fgG, fgB] = [56, 189, 248];
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const i = y * (size * 3 + 1) + 1 + x * 3;
      // Horizontal bar through the middle third = the "barbell".
      const inBar = y > size * 0.42 && y < size * 0.58 && x > size * 0.15 && x < size * 0.85;
      const inPlateL = x > size * 0.15 && x < size * 0.3 && y > size * 0.3 && y < size * 0.7;
      const inPlateR = x > size * 0.7 && x < size * 0.85 && y > size * 0.3 && y < size * 0.7;
      const fg = inBar || inPlateL || inPlateR;
      raw[i] = fg ? fgR : bgR;
      raw[i + 1] = fg ? fgG : bgG;
      raw[i + 2] = fg ? fgB : bgB;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public', { recursive: true });
writeFileSync('public/pwa-192.png', png(192));
writeFileSync('public/pwa-512.png', png(512));
writeFileSync('public/apple-touch-icon.png', png(180));
writeFileSync(
  'public/favicon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#0f172a"/><rect x="15" y="44" width="70" height="12" fill="#38bdf8"/><rect x="15" y="32" width="14" height="36" fill="#38bdf8"/><rect x="71" y="32" width="14" height="36" fill="#38bdf8"/></svg>`,
);
console.log('icons written to public/');
