// 2D sprite → 3D voxels by "inflation" (DESIGN.md §4.3).
//
// Grid cells are integers (ix, iy, iz); voxel centres are cell + 0.5 so cubes
// line up with the grid. +Y up, +Z faces the camera, origin = centre of the
// footprint at ground level.

import { FRONT, HEAD_LAST_ROW, TAIL_SIDE, TAIL_BASE_Y } from './dragonSprite.js';
import { MATERIALS, MATERIAL_ID, PART_ID } from './palette.js';
import { VoxelModel, FLAG_INTERIOR, FLAG_SURFACE, FLAG_FRONT_FACE } from './VoxelModel.js';
import { hexToLinear } from '../core/colour.js';
import { hash3 } from '../core/hash.js';

const BODY_CHARS = new Set(['G', 'E', 'h', 'e', 'm', 'r', 'y', 'B']);
const DECAL_CHARS = new Set(['e', 'm', 'r']); // recolour the front voxel only
const BELLY_CHARS = new Set(['y', 'B']); // front voxel + 1 protruding voxel

export const DEFAULT_EXTRUDE = {
  maxHalfDepth: 6, // body is up to 2 × this deep
  earHalfDepth: 2,
  hornHalfDepth: 1,
  wingZ: -3, // wing plate cell (1 voxel thick), behind the shoulders
  tailBaseWidth: 4,
  tailTipWidth: 2,
};

export function extrudeDragon(opts = {}) {
  const o = { ...DEFAULT_EXTRUDE, ...opts };
  const rows = FRONT.length;
  const cols = FRONT[0].length;
  const xOff = cols / 2;
  const at = (r, c) => (r >= 0 && r < rows && c >= 0 && c < cols ? FRONT[r][c] : '.');

  // 1. Distance transform of the body silhouette (brute force; 32×32 is tiny).
  const dist = new Float32Array(rows * cols);
  const empties = [];
  for (let r = -1; r <= rows; r++)
    for (let c = -1; c <= cols; c++) if (!BODY_CHARS.has(at(r, c))) empties.push([r, c]);
  let maxDist = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!BODY_CHARS.has(at(r, c))) continue;
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
    const ch = at(r, c);
    if (ch === 'h') return o.hornHalfDepth;
    const d = Math.max(1, Math.round(o.maxHalfDepth * Math.sqrt(dist[r * cols + c] / maxDist)));
    return ch === 'E' ? Math.min(d, o.earHalfDepth) : d;
  };

  // 2. Emit cells into an occupancy map.
  const cells = new Map(); // "ix|iy|iz" → { ix, iy, iz, mat, part, front }
  const put = (ix, iy, iz, ch, part, front = false) => {
    cells.set(`${ix}|${iy}|${iz}`, { ix, iy, iz, mat: MATERIAL_ID[ch], part, front });
  };

  for (let r = 0; r < rows; r++) {
    const iy = rows - 1 - r;
    for (let c = 0; c < cols; c++) {
      const ch = at(r, c);
      const ix = c - xOff;
      if (BODY_CHARS.has(ch)) {
        const part = r <= HEAD_LAST_ROW ? PART_ID.HEAD : PART_ID.BODY;
        const h = halfDepth(r, c);
        const fill = DECAL_CHARS.has(ch) || BELLY_CHARS.has(ch) ? 'G' : ch;
        for (let iz = -h; iz < h; iz++) put(ix, iy, iz, fill, part);
        if (DECAL_CHARS.has(ch)) put(ix, iy, h - 1, ch, part, true);
        else if (BELLY_CHARS.has(ch)) {
          put(ix, iy, h - 1, ch, part);
          put(ix, iy, h, ch, part, true);
        } else cells.get(`${ix}|${iy}|${h - 1}`).front = true;
      } else if (ch === 'w') {
        put(ix, iy, o.wingZ, 'w', ix < 0 ? PART_ID.WING_R : PART_ID.WING_L);
      }
    }
  }

  // 3. Tail from the side sprite, attached to the back surface at the centre column.
  const tailRow = rows - 1 - TAIL_BASE_Y;
  const backZ = -halfDepth(tailRow, xOff); // first cell behind the body is backZ - 1
  const tRows = TAIL_SIDE.length;
  const tCols = TAIL_SIDE[0].length;
  for (let r = 0; r < tRows; r++) {
    const iy = TAIL_BASE_Y + (tRows - 1 - r);
    for (let k = 0; k < tCols; k++) {
      if (TAIL_SIDE[r][k] !== 't') continue;
      const w = k < tCols / 3 ? o.tailBaseWidth : o.tailTipWidth;
      for (let ix = -w / 2; ix < w / 2; ix++) put(ix, iy, backZ - 1 - k, 't', PART_ID.TAIL);
    }
  }

  // 4. Classify surface vs interior, order surface first (DESIGN.md §4.3 shell culling).
  const all = [...cells.values()];
  const has = (x, y, z) => cells.has(`${x}|${y}|${z}`);
  for (const v of all) {
    const { ix: x, iy: y, iz: z } = v;
    v.interior = has(x + 1, y, z) && has(x - 1, y, z) && has(x, y + 1, z) && has(x, y - 1, z) && has(x, y, z + 1) && has(x, y, z - 1);
  }
  all.sort((a, b) => a.interior - b.interior);

  // 5. Pack into SoA buffers.
  const model = new VoxelModel(all.length);
  const colours = MATERIALS.map((m) => hexToLinear(m.hex));
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  let surface = 0;
  all.forEach((v, i) => {
    const p = [v.ix + 0.5, v.iy + 0.5, v.iz + 0.5];
    model.basePos.set(p, i * 3);
    model.baseColour.set(colours[v.mat - 1], i * 3);
    model.material[i] = v.mat;
    model.partId[i] = v.part;
    model.flags[i] = (v.interior ? FLAG_INTERIOR : FLAG_SURFACE) | (v.front ? FLAG_FRONT_FACE : 0);
    model.rand[i] = hash3(v.ix, v.iy, v.iz);
    if (!v.interior) surface++;
    for (let a = 0; a < 3; a++) {
      min[a] = Math.min(min[a], p[a] - 0.5);
      max[a] = Math.max(max[a], p[a] + 0.5);
    }
  });
  model.surfaceCount = surface;
  model.bounds = { min, max, centre: min.map((m, a) => (m + max[a]) / 2) };

  // 6. Part pivots, derived from the data.
  const neckY = rows - 1 - HEAD_LAST_ROW;
  model.parts.HEAD = { pivot: [0, neckY, 0], axis: [0, 0, 1] };
  model.parts.BODY = { pivot: [0, 0, 0], axis: [0, 1, 0] };
  for (const [name, sign] of [['WING_L', 1], ['WING_R', -1]]) {
    const idx = model.select({ parts: [name] });
    let inner = Infinity, ySum = 0;
    for (const i of idx) {
      inner = Math.min(inner, Math.abs(model.basePos[i * 3]));
      ySum += model.basePos[i * 3 + 1];
    }
    model.parts[name] = { pivot: [sign * (inner - 0.5), ySum / idx.length, o.wingZ + 0.5], axis: [0, 1, 0] };
  }
  model.parts.TAIL = { pivot: [0, TAIL_BASE_Y + 1, backZ], axis: [0, 1, 0] };

  return model;
}
