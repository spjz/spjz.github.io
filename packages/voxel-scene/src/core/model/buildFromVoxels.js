// Raw voxel list → VoxelModel (REACT_DESIGN.md §7 `kind: 'voxels'`).
// Escape hatch for anything authored elsewhere (code, MagicaVoxel, generators).

import { packModel } from './pack.js';

/**
 * @typedef {Object} RawVoxel
 * @property {number} x  integer cell
 * @property {number} y
 * @property {number} z
 * @property {string|number} colour  '#rrggbb' or 0xrrggbb (sRGB)
 * @property {string} [part]      defaults to 'BODY'
 * @property {string} [material]  material key; defaults to the colour
 */

/**
 * @param {RawVoxel[]} voxels
 * @param {{ centre?: boolean, selectors?: Record<string, any>, pivots?: Record<string, number[]>, axes?: Record<string, number[]> }} [opts]
 *   centre: shift so the footprint is centred on x/z and the lowest voxel rests on y = 0 (default true)
 */
export function buildFromVoxels(voxels, opts = {}) {
  const centre = opts.centre ?? true;
  let dx = 0, dy = 0, dz = 0;
  if (centre && voxels.length) {
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (const v of voxels) {
      lo[0] = Math.min(lo[0], v.x); hi[0] = Math.max(hi[0], v.x);
      lo[1] = Math.min(lo[1], v.y); hi[1] = Math.max(hi[1], v.y);
      lo[2] = Math.min(lo[2], v.z); hi[2] = Math.max(hi[2], v.z);
    }
    dx = -Math.floor((lo[0] + hi[0] + 1) / 2);
    dy = -lo[1];
    dz = -Math.floor((lo[2] + hi[2] + 1) / 2);
  }

  /** @type {Map<string, import('./VoxelModel.js').Material>} */
  const materials = new Map();
  const partNames = [];
  /** @type {Map<string, import('./pack.js').Cell>} */
  const cells = new Map();
  for (const v of voxels) {
    const hex = typeof v.colour === 'number' ? `#${v.colour.toString(16).padStart(6, '0')}` : v.colour;
    const key = v.material ?? hex.toLowerCase();
    if (!materials.has(key)) materials.set(key, { ch: key, name: key, hex });
    const part = v.part ?? 'BODY';
    if (!partNames.includes(part)) partNames.push(part);
    const ix = v.x + dx, iy = v.y + dy, iz = v.z + dz;
    cells.set(`${ix}|${iy}|${iz}`, { ix, iy, iz, mat: key, part });
  }

  return packModel(cells, {
    materials: [...materials.values()],
    partNames,
    selectors: opts.selectors,
    pivots: opts.pivots,
    axes: opts.axes,
  });
}
