// Shared final stage for every subject builder: occupancy → surface/interior
// classification → SoA buffers → bounds → pivots (DESIGN.md §4.3–4.4).

import { VoxelModel, FLAG_INTERIOR, FLAG_SURFACE, FLAG_FRONT_FACE } from './VoxelModel.js';
import { hexToLinear } from '../colour.js';
import { hash3 } from '../hash.js';

/**
 * @typedef {Object} Cell
 * @property {number} ix  integer grid cell; the voxel centre is cell + 0.5
 * @property {number} iy
 * @property {number} iz
 * @property {string} mat material key (Material.ch)
 * @property {string} part
 * @property {boolean} [front]
 * @property {boolean} [interior]  set by packModel
 */

/**
 * @param {Map<string, Cell>} cells  keyed "ix|iy|iz"
 * @param {{
 *   materials: import('./VoxelModel.js').Material[],
 *   partNames: string[],
 *   selectors?: Record<string, import('./VoxelModel.js').Selector>,
 *   pivots?: Record<string, number[]>,
 *   axes?: Record<string, number[]>,
 * }} meta
 */
export function packModel(cells, meta) {
  const all = [...cells.values()];
  const has = (x, y, z) => cells.has(`${x}|${y}|${z}`);
  for (const v of all) {
    const { ix: x, iy: y, iz: z } = v;
    v.interior = has(x + 1, y, z) && has(x - 1, y, z) && has(x, y + 1, z) && has(x, y - 1, z) && has(x, y, z + 1) && has(x, y, z - 1);
  }
  all.sort((a, b) => Number(a.interior) - Number(b.interior)); // surface first (stable)

  // Only keep parts that actually have voxels, in declaration order.
  const used = new Set(all.map((v) => v.part));
  const partNames = meta.partNames.filter((p) => used.has(p));
  for (const p of used) if (!partNames.includes(p)) partNames.push(p);

  const model = new VoxelModel(all.length, { materials: meta.materials, partNames, selectors: meta.selectors });
  const colours = meta.materials.map((m) => hexToLinear(m.hex));
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  let surface = 0;
  all.forEach((v, i) => {
    const p = [v.ix + 0.5, v.iy + 0.5, v.iz + 0.5];
    const mid = model.materialId[v.mat];
    model.basePos.set(p, i * 3);
    model.baseColour.set(colours[mid - 1], i * 3);
    model.material[i] = mid;
    model.partId[i] = model.partIdOf[v.part];
    model.flags[i] = (v.interior ? FLAG_INTERIOR : FLAG_SURFACE) | (v.front ? FLAG_FRONT_FACE : 0);
    model.rand[i] = hash3(v.ix, v.iy, v.iz);
    if (!v.interior) surface++;
    for (let a = 0; a < 3; a++) {
      min[a] = Math.min(min[a], p[a] - 0.5);
      max[a] = Math.max(max[a], p[a] + 0.5);
    }
  });
  model.surfaceCount = surface;
  model.bounds = all.length ? { min, max, centre: min.map((m, a) => (m + max[a]) / 2) } : { min: [0, 0, 0], max: [0, 0, 0], centre: [0, 0, 0] };

  // Pivots: explicit ones from the builder/definition, otherwise the part's bottom-centre.
  for (const name of partNames) {
    let pivot = meta.pivots?.[name];
    if (!pivot) {
      const idx = model.select({ parts: [name] });
      let sx = 0, sz = 0, lowY = Infinity;
      for (const i of idx) {
        sx += model.basePos[i * 3];
        sz += model.basePos[i * 3 + 2];
        lowY = Math.min(lowY, model.basePos[i * 3 + 1] - 0.5);
      }
      pivot = [sx / idx.length, lowY, sz / idx.length];
    }
    model.parts[name] = { pivot: [...pivot], axis: [...(meta.axes?.[name] || [0, 1, 0])] };
  }
  return model;
}
