#!/usr/bin/env node
// Offline: PNG → draft ASCII sprite (DESIGN.md §4.2), using the same quantiser
// as the browser `image` subject. Hand-clean the output into a SpriteDef.
//
//   node tools/png-to-sprite.mjs iamadragon.png [columns=32] [--auto[=k]]
//
// Default palette is the dragon's reference colours; --auto quantises with k-means.
// No dependencies: decodes 8-bit RGB/RGBA non-interlaced PNG with node:zlib.

import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { spriteFromPixels } from '../packages/voxel-scene/src/core/model/spriteFromPixels.js';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--') && !/^\d+$/.test(a)) ?? 'iamadragon.png';
const columns = Number(args.find((a) => /^\d+$/.test(a)) ?? 32);
const auto = args.find((a) => a.startsWith('--auto'));
const k = auto?.includes('=') ? Number(auto.split('=')[1]) : 8;

const DRAGON_PALETTE = [
  { ch: 'G', rgb: [168, 212, 0] }, // body
  { ch: 'w', rgb: [0, 128, 0] }, // wing
  { ch: 'y', rgb: [255, 217, 90] }, // belly
  { ch: 't', rgb: [136, 168, 0] }, // tail
  { ch: 'r', rgb: [255, 0, 0] }, // cheek
  { ch: '#', rgb: [0, 0, 0] }, // outline / eye
];

function decodePng(buf) {
  let p = 8, w, h, colourType;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      if (data[8] !== 8 || data[12] !== 0) throw new Error('only 8-bit non-interlaced PNGs are supported');
      colourType = data[9];
    } else if (type === 'IDAT') idat.push(data);
    p += 12 + len;
  }
  const bpp = colourType === 6 ? 4 : colourType === 2 ? 3 : 0;
  if (!bpp) throw new Error('only RGB/RGBA PNGs are supported');
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * bpp;
  const px = new Uint8Array(w * h * 4);
  let prev = new Uint8Array(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const line = Uint8Array.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? line[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let pr = 0;
      if (f === 1) pr = a;
      else if (f === 2) pr = b;
      else if (f === 3) pr = (a + b) >> 1;
      else if (f === 4) {
        const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      line[i] = (line[i] + pr) & 255;
    }
    for (let x = 0; x < w; x++) {
      const s = x * bpp, d = (y * w + x) * 4;
      px[d] = line[s];
      px[d + 1] = line[s + 1];
      px[d + 2] = line[s + 2];
      px[d + 3] = bpp === 4 ? line[s + 3] : 255;
    }
    prev = line;
  }
  return { w, h, px };
}

const { w, h, px } = decodePng(readFileSync(file));
const { rows, palette } = spriteFromPixels(px, w, h, auto ? { columns, colours: k } : { columns, palette: DRAGON_PALETTE });
console.log(`// ${file} → ${columns} columns; palette: ${palette.map((p) => `${p.ch}=rgb(${p.rgb.join(',')})`).join(' ')}`);
console.log(rows.map((l) => `  '${l}',`).join('\n'));
