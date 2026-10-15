// RGBA pixels → ASCII sprite (DESIGN.md §4.2). Pure; shared by
// tools/png-to-sprite.mjs (Node) and the `image` subject (browser canvas).

/**
 * @typedef {{ ch: string, rgb: number[] }} PaletteEntry
 * @typedef {Object} SpriteFromPixelsOptions
 * @property {number} [columns]  output width in cells (default 32)
 * @property {PaletteEntry[]} [palette]  fixed palette; omit to quantise automatically (k-means)
 * @property {number} [colours]  k for automatic quantisation (default 8)
 * @property {string} [outline]  palette char treated as outline: kept only when it dominates a cell (default '#')
 * @property {number} [alphaThreshold] (default 128)
 */

const nearest = (palette, r, g, b) => {
  let best = palette[0].ch, bd = Infinity;
  for (const e of palette) {
    const d = (r - e.rgb[0]) ** 2 + (g - e.rgb[1]) ** 2 + (b - e.rgb[2]) ** 2;
    if (d < bd) { bd = d; best = e.ch; }
  }
  return best;
};

/** Small deterministic k-means over opaque pixels (sampled). */
export function quantise(px, w, h, k = 8, alphaThreshold = 128) {
  const samples = [];
  const step = Math.max(1, Math.floor((w * h) / 20000));
  for (let i = 0; i < w * h; i += step) {
    if (px[i * 4 + 3] >= alphaThreshold) samples.push([px[i * 4], px[i * 4 + 1], px[i * 4 + 2]]);
  }
  if (!samples.length) return [];
  // Deterministic seeding from a colour histogram: take the most common colours
  // that are clearly distinct from seeds already chosen. Prevalence keeps rare
  // anti-aliasing pixels out; distinctness keeps small regions (cheeks, belly).
  const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  const buckets = new Map();
  for (const s of samples) {
    const key = ((s[0] >> 4) << 8) | ((s[1] >> 4) << 4) | (s[2] >> 4);
    const b = buckets.get(key) ?? { n: 0, sum: [0, 0, 0] };
    b.n++;
    b.sum[0] += s[0]; b.sum[1] += s[1]; b.sum[2] += s[2];
    buckets.set(key, b);
  }
  const ranked = [...buckets.values()]
    .filter((b) => b.n >= samples.length * 0.002) // ignore edge noise
    .sort((a, b) => b.n - a.n)
    .map((b) => b.sum.map((v) => v / b.n));
  let centres = [];
  for (const minDist of [80, 50, 25]) {
    for (const c of ranked) {
      if (centres.length >= k) break;
      if (centres.every((x) => d2(x, c) > minDist * minDist)) centres.push(c);
    }
    if (centres.length >= k) break;
  }
  if (!centres.length) centres = [[...samples[0]]];
  for (let iter = 0; iter < 12; iter++) {
    const sums = centres.map(() => [0, 0, 0, 0]);
    for (const s of samples) {
      let bi = 0, bd = Infinity;
      centres.forEach((c, ci) => {
        const d = (s[0] - c[0]) ** 2 + (s[1] - c[1]) ** 2 + (s[2] - c[2]) ** 2;
        if (d < bd) { bd = d; bi = ci; }
      });
      const t = sums[bi];
      t[0] += s[0]; t[1] += s[1]; t[2] += s[2]; t[3]++;
    }
    centres = sums.filter((t) => t[3] > 0).map((t) => [t[0] / t[3], t[1] / t[3], t[2] / t[3]].map(Math.round));
  }
  // Darkest cluster becomes the outline '#'; the rest get letters.
  const lum = (c) => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
  centres.sort((a, b) => lum(a) - lum(b));
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  return centres.map((rgb, i) => ({ ch: i === 0 && lum(rgb) < 40 ? '#' : letters[i], rgb }));
}

/**
 * @param {Uint8Array|Uint8ClampedArray} px  RGBA, row-major
 * @param {number} w
 * @param {number} h
 * @param {SpriteFromPixelsOptions} [opts]
 * @returns {{ rows: string[], palette: PaletteEntry[] }}
 */
export function spriteFromPixels(px, w, h, opts = {}) {
  const columns = opts.columns ?? 32;
  const alphaThreshold = opts.alphaThreshold ?? 128;
  const outline = opts.outline ?? '#';
  const palette = opts.palette ?? quantise(px, w, h, opts.colours ?? 8, alphaThreshold);
  const cell = w / columns;
  const rowsN = Math.round(h / cell);
  const rows = [];
  for (let cy = 0; cy < rowsN; cy++) {
    let line = '';
    for (let cx = 0; cx < columns; cx++) {
      const counts = {};
      let total = 0;
      for (let y = Math.floor(cy * cell); y < Math.floor((cy + 1) * cell); y++) {
        for (let x = Math.floor(cx * cell); x < Math.floor((cx + 1) * cell); x++) {
          const i = (y * w + x) * 4;
          total++;
          if (px[i + 3] < alphaThreshold) { counts['.'] = (counts['.'] || 0) + 1; continue; }
          const ch = nearest(palette, px[i], px[i + 1], px[i + 2]);
          counts[ch] = (counts[ch] || 0) + 1;
        }
      }
      // Outline only wins when it dominates the cell (eyes); otherwise the most
      // common fill wins, so thin outlines between regions vanish.
      const dark = counts[outline] || 0;
      let ch = '.';
      if (dark > total * 0.55) ch = outline;
      else {
        let bestN = 0;
        for (const [k, n] of Object.entries(counts)) {
          if (k === outline) continue;
          if (n > bestN) { bestN = n; ch = k; }
        }
        if (ch === '.' && dark > total * 0.35) ch = outline;
      }
      line += ch;
    }
    rows.push(line);
  }
  return { rows, palette };
}
