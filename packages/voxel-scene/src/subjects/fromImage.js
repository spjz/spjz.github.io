// `image` subject: decode in the browser with a canvas, quantise to a sprite,
// then extrude (REACT_DESIGN.md §7). Lazy-loaded by resolveSubject.

import { spriteFromPixels } from '../core/model/spriteFromPixels.js';
import { buildFromSprite } from '../core/model/buildFromSprite.js';

const toHex = (rgb) => (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];

/** @param {import('./index.js').ImageSubject} def */
export async function buildFromImage(def) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = def.src;
  await img.decode();
  const w = img.naturalWidth, h = img.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const { data } = g.getImageData(0, 0, w, h);

  const { rows, palette } = spriteFromPixels(data, w, h, { columns: def.columns ?? 32, colours: def.colours, palette: def.palette });

  // Most common non-outline colour fills behind outline decals.
  const counts = {};
  for (const r of rows) for (const ch of r) if (ch !== '.' && ch !== '#') counts[ch] = (counts[ch] || 0) + 1;
  const fill = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];

  return buildFromSprite({
    front: rows,
    palette: palette.map((p) => ({
      ch: p.ch,
      name: p.ch === '#' ? 'outline' : `colour-${p.ch}`,
      hex: toHex(p.rgb),
      ...(p.ch === '#' && fill ? { role: 'decal', fill } : { role: 'solid' }),
    })),
    extrude: { maxHalfDepth: def.extrude?.maxHalfDepth ?? 4 },
  });
}
