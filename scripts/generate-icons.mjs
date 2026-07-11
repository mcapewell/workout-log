// Generates PNG app icons (no external deps) so the PWA installs cleanly.
// Draws a dumbbell mark traced from the app icon design: a central handle
// flanked by graduated weight bars (tallest inner, then middle, then short end
// caps) in the accent colour on a dark field. Geometry is shared with
// public/favicon.svg; 3x supersampling anti-aliases the rounded corners.
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

const BG = [15, 23, 42]; // theme base
const FG = [56, 189, 248]; // theme accent

// Dumbbell bars as rounded rects [x0, y0, x1, y1, r] in a 512-unit space,
// matching public/favicon.svg. Normalised to fractions so they scale to any
// icon size.
const bars = [
  [184, 221, 328, 291, 20], // handle
  [140, 106, 184, 406, 22], // inner plate (left, tallest)
  [328, 106, 372, 406, 22], // inner plate (right, tallest)
  [78, 140, 122, 372, 22], // middle plate (left)
  [390, 140, 434, 372, 22], // middle plate (right)
  [26, 212, 60, 300, 16], // end cap (left)
  [452, 212, 486, 300, 16], // end cap (right)
].map(([x0, y0, x1, y1, r]) => [x0 / 512, y0 / 512, x1 / 512, y1 / 512, r / 512]);

// Is normalised point (x, y) inside a rounded rect?
function inRoundRect(x, y, [x0, y0, x1, y1, r]) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

function png(size) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  const SS = 3; // supersampling per axis for anti-aliased edges
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const i = y * (size * 3 + 1) + 1 + x * 3;
      let hits = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const nx = (x + (sx + 0.5) / SS) / size;
          const ny = (y + (sy + 0.5) / SS) / size;
          if (bars.some((b) => inRoundRect(nx, ny, b))) hits++;
        }
      }
      const t = hits / (SS * SS);
      raw[i] = Math.round(BG[0] + (FG[0] - BG[0]) * t);
      raw[i + 1] = Math.round(BG[1] + (FG[1] - BG[1]) * t);
      raw[i + 2] = Math.round(BG[2] + (FG[2] - BG[2]) * t);
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
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#0f172a"/><rect x="184" y="221" width="144" height="70" rx="20" fill="#38bdf8"/><rect x="140" y="106" width="44" height="300" rx="22" fill="#38bdf8"/><rect x="328" y="106" width="44" height="300" rx="22" fill="#38bdf8"/><rect x="78" y="140" width="44" height="232" rx="22" fill="#38bdf8"/><rect x="390" y="140" width="44" height="232" rx="22" fill="#38bdf8"/><rect x="26" y="212" width="34" height="88" rx="16" fill="#38bdf8"/><rect x="452" y="212" width="34" height="88" rx="16" fill="#38bdf8"/></svg>`,
);
console.log('icons written to public/');
