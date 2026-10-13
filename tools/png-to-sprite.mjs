#!/usr/bin/env node
// Offline: reference PNG → draft ASCII sprite (DESIGN.md §4.2).
// Usage: node tools/png-to-sprite.mjs iamadragon.png [cols=32]
// Output is a draft to hand-clean into src/model/dragonSprite.js.
// No dependencies: decodes 8-bit RGBA/RGB non-interlaced PNG with node:zlib.

import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

const [, , file = 'iamadragon.png', colsArg = '32'] = process.argv;
const COLS = Number(colsArg);

// Reference palette sampled from iamadragon.png.
const PALETTE = [
  { ch: 'G', rgb: [168, 212, 0] },   // body
  { ch: 'w', rgb: [0, 128, 0] },     // wing
  { ch: 'y', rgb: [255, 217, 90] },  // belly
  { ch: 't', rgb: [136, 168, 0] },   // tail (darker olive)
  { ch: 'r', rgb: [255, 0, 0] },     // cheek
  { ch: '#', rgb: [0, 0, 0] },       // outline / eye
];

function decodePng(buf) {
  let p = 8, w, h, colourType, idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      if (data[8] !== 8 || data[12] !== 0) throw new Error('only 8-bit non-interlaced supported');
      colourType = data[9];
    } else if (type === 'IDAT') idat.push(data);
    p += 12 + len;
  }
  const bpp = colourType === 6 ? 4 : colourType === 2 ? 3 : 0;
  if (!bpp) throw new Error('only RGB/RGBA supported');
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
      px[d] = line[s]; px[d + 1] = line[s + 1]; px[d + 2] = line[s + 2];
      px[d + 3] = bpp === 4 ? line[s + 3] : 255;
    }
    prev = line;
  }
  return { w, h, px };
}

function nearest(r, g, b) {
  let best = null, bd = Infinity;
  for (const e of PALETTE) {
    const d = (r - e.rgb[0]) ** 2 + (g - e.rgb[1]) ** 2 + (b - e.rgb[2]) ** 2;
    if (d < bd) { bd = d; best = e.ch; }
  }
  return best;
}

const { w, h, px } = decodePng(readFileSync(file));
const cell = w / COLS;
const rows = Math.round(h / cell);
const out = [];
for (let cy = 0; cy < rows; cy++) {
  let line = '';
  for (let cx = 0; cx < COLS; cx++) {
    const counts = {};
    let total = 0;
    for (let y = Math.floor(cy * cell); y < Math.floor((cy + 1) * cell); y++) {
      for (let x = Math.floor(cx * cell); x < Math.floor((cx + 1) * cell); x++) {
        const i = (y * w + x) * 4;
        total++;
        if (px[i + 3] < 128) { counts['.'] = (counts['.'] || 0) + 1; continue; }
        const ch = nearest(px[i], px[i + 1], px[i + 2]);
        counts[ch] = (counts[ch] || 0) + 1;
      }
    }
    // Outline black only wins when it dominates the cell (eyes); otherwise the
    // most common fill colour wins, so thin outlines between regions vanish.
    const black = counts['#'] || 0;
    let ch = '.';
    if (black > total * 0.55) ch = '#';
    else {
      let bestN = 0;
      for (const [k, n] of Object.entries(counts)) {
        if (k === '#') continue;
        if (n > bestN) { bestN = n; ch = k; }
      }
      if (ch === '.' && black > total * 0.35) ch = '#';
    }
    line += ch;
  }
  out.push(line);
}
console.log(out.map((l) => `  '${l}',`).join('\n'));
