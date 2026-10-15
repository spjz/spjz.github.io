// Data-driven sprite → voxels by "inflation" (DESIGN.md §4.3, REACT_DESIGN.md §7).
//
// The PoC's hard-coded rules are now per-material roles:
//   solid    – inflated by the silhouette's distance transform, mirrored ±z
//   decal    – solid geometry filled with `fill`; only the front voxel takes this colour
//   protrude – like decal, plus one extra voxel sticking out of the front face
//   plate    – a single voxel at depth `z` (wings); `sideParts` = [part for −x, part for +x]
// Side sprites (tails) are extruded along x and attached behind the body.

import { packModel } from './pack.js';

/**
 * @typedef {import('./VoxelModel.js').Material & {
 *   role?: 'solid'|'decal'|'protrude'|'plate'|'side',
 *   fill?: string, halfDepth?: number, maxHalfDepth?: number,
 *   z?: number, part?: string, sideParts?: [string, string],
 * }} SpriteMaterial
 *
 * @typedef {Object} SideSprite
 * @property {string[]} sprite     rows top → bottom; columns run backwards from the body
 * @property {string} material
 * @property {string} part
 * @property {number} baseY        grid y of the sprite's bottom row
 * @property {number} [attachColumn]  front-sprite column whose depth defines the back surface (default: centre)
 * @property {number} [baseWidth]  x width for the first third of the columns
 * @property {number} [tipWidth]
 *
 * @typedef {Object} SpriteDef
 * @property {'sprite'} [kind]
 * @property {string[]} front      rows top → bottom; '.' is empty; bottom row stands on y = 0
 * @property {SpriteMaterial[]} palette
 * @property {{ rows?: { to: number, part: string }[], default?: string }} [parts]
 * @property {SideSprite[]} [sides]
 * @property {{ maxHalfDepth?: number }} [extrude]
 * @property {Record<string, number[]>} [pivots]
 * @property {Record<string, number[]>} [axes]
 * @property {Record<string, import('./VoxelModel.js').Selector>} [selectors]
 */

const VOLUME_ROLES = new Set(['solid', 'decal', 'protrude']);

/** @param {SpriteDef} def */
export function buildFromSprite(def) {
  const front = def.front;
  const rows = front.length;
  const cols = Math.max(...front.map((r) => r.length));
  const xOff = cols / 2;
  const maxHalf = def.extrude?.maxHalfDepth ?? 6;
  const mats = Object.fromEntries(def.palette.map((m) => [m.ch, m]));
  const role = (ch) => mats[ch]?.role ?? (mats[ch] ? 'solid' : null);
  const at = (r, c) => (r >= 0 && r < rows && c >= 0 && c < cols ? front[r][c] || '.' : '.');
  const isVolume = (r, c) => VOLUME_ROLES.has(role(at(r, c)));

  // Row → part for volume materials without an explicit part.
  const rowRules = def.parts?.rows || [];
  const defaultPart = def.parts?.default || 'BODY';
  const rowPart = (r) => rowRules.find((rule) => r <= rule.to)?.part ?? defaultPart;

  // 1. Distance transform of the volume silhouette (brute force; sprites are small).
  const dist = new Float32Array(rows * cols);
  const empties = [];
  for (let r = -1; r <= rows; r++) for (let c = -1; c <= cols; c++) if (!isVolume(r, c)) empties.push([r, c]);
  let maxDist = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!isVolume(r, c)) continue;
      let best = Infinity;
      for (const [er, ec] of empties) {
        const d = (er - r) ** 2 + (ec - c) ** 2;
        if (d < best) best = d;
      }
      dist[r * cols + c] = Math.sqrt(best);
      maxDist = Math.max(maxDist, dist[r * cols + c]);
    }
  }
  const halfDepth = (r, c) => {
    const m = mats[at(r, c)];
    if (m?.halfDepth) return m.halfDepth;
    const d = Math.max(1, Math.round(maxHalf * Math.sqrt(dist[r * cols + c] / (maxDist || 1))));
    return m?.maxHalfDepth ? Math.min(d, m.maxHalfDepth) : d;
  };

  // 2. Emit cells.
  /** @type {Map<string, import('./pack.js').Cell>} */
  const cells = new Map();
  const put = (ix, iy, iz, mat, part, frontFace = false) => {
    cells.set(`${ix}|${iy}|${iz}`, { ix, iy, iz, mat, part, front: frontFace });
  };
  const pivots = { ...(def.pivots || {}) };
  /** @type {Record<string, { inner: number, ySum: number, n: number, z: number, sign: number }>} */
  const plateStats = {};

  for (let r = 0; r < rows; r++) {
    const iy = rows - 1 - r;
    for (let c = 0; c < cols; c++) {
      const ch = at(r, c);
      const m = mats[ch];
      if (!m) continue;
      const ix = c - xOff;
      const rl = role(ch);
      if (VOLUME_ROLES.has(rl)) {
        const part = m.part ?? rowPart(r);
        const h = halfDepth(r, c);
        const fill = rl === 'solid' ? ch : m.fill;
        for (let iz = -h; iz < h; iz++) put(ix, iy, iz, fill, part);
        if (rl === 'decal') put(ix, iy, h - 1, ch, part, true);
        else if (rl === 'protrude') {
          put(ix, iy, h - 1, ch, part);
          put(ix, iy, h, ch, part, true);
        } else cells.get(`${ix}|${iy}|${h - 1}`).front = true;
      } else if (rl === 'plate') {
        const z = m.z ?? -3;
        const sign = ix < 0 ? -1 : 1;
        const part = m.sideParts ? m.sideParts[ix < 0 ? 0 : 1] : (m.part ?? 'PLATE');
        put(ix, iy, z, ch, part);
        const s = (plateStats[part] ??= { inner: Infinity, ySum: 0, n: 0, z, sign });
        s.inner = Math.min(s.inner, Math.abs(ix + 0.5));
        s.ySum += iy + 0.5;
        s.n++;
      }
    }
  }

  // 3. Side sprites (tails), attached to the back surface.
  for (const side of def.sides || []) {
    const attachRow = rows - 1 - side.baseY;
    const backZ = -halfDepth(attachRow, side.attachColumn ?? xOff);
    const tRows = side.sprite.length;
    const tCols = Math.max(...side.sprite.map((s) => s.length));
    for (let r = 0; r < tRows; r++) {
      const iy = side.baseY + (tRows - 1 - r);
      for (let k = 0; k < tCols; k++) {
        if (side.sprite[r][k] !== side.material) continue;
        const w = k < tCols / 3 ? (side.baseWidth ?? 4) : (side.tipWidth ?? 2);
        for (let ix = -w / 2; ix < w / 2; ix++) put(ix, iy, backZ - 1 - k, side.material, side.part);
      }
    }
    pivots[side.part] ??= [0, side.baseY + 1, backZ];
  }

  // 4. Pivots: row-range parts at their bottom row, plates at their inner edge.
  let prevTo = -1;
  for (const rule of rowRules) {
    pivots[rule.part] ??= [0, rows - 1 - rule.to, 0];
    prevTo = rule.to;
  }
  if (prevTo < rows - 1) pivots[defaultPart] ??= [0, 0, 0];
  for (const [part, s] of Object.entries(plateStats)) {
    pivots[part] ??= [s.sign * (s.inner - 0.5), s.ySum / s.n, s.z + 0.5];
  }

  const partNames = [
    ...rowRules.map((r) => r.part),
    defaultPart,
    ...def.palette.flatMap((m) => m.sideParts || (m.part ? [m.part] : [])),
    ...(def.sides || []).map((s) => s.part),
  ].filter((p, i, a) => a.indexOf(p) === i);

  return packModel(cells, {
    materials: def.palette,
    partNames,
    selectors: def.selectors,
    pivots,
    axes: def.axes,
  });
}
