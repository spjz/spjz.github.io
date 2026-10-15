// Struct-of-arrays voxel storage (DESIGN.md §4.4). Base buffers are read-only
// once built; effects write to the EffectStack's work buffers instead.

import { MATERIALS, MATERIAL_ID, PARTS, PART_ID, SELECTORS } from './palette.js';

export const FLAG_INTERIOR = 1;
export const FLAG_SURFACE = 2;
export const FLAG_FRONT_FACE = 4;

export class VoxelModel {
  constructor(count) {
    this.count = count;
    this.surfaceCount = count; // voxels [0, surfaceCount) are surface; the rest are interior
    this.basePos = new Float32Array(count * 3);
    this.baseColour = new Float32Array(count * 3);
    this.material = new Uint8Array(count);
    this.partId = new Uint8Array(count);
    this.flags = new Uint8Array(count);
    this.rand = new Float32Array(count);
    this.parts = Object.fromEntries(PARTS.map((p) => [p, { pivot: [0, 0, 0], axis: [0, 1, 0] }]));
    this.bounds = { min: [0, 0, 0], max: [0, 0, 0], centre: [0, 0, 0] };
    this._selectCache = new Map();
  }

  /**
   * Index list for a selector: a SELECTORS name or { parts?, materials?, includeInterior? }.
   * Results are cached; the model is immutable after build.
   */
  select(selector = 'all') {
    const key = typeof selector === 'string' ? selector : JSON.stringify(selector);
    let hit = this._selectCache.get(key);
    if (hit) return hit;
    const sel = typeof selector === 'string' ? SELECTORS[selector] || {} : selector;
    const parts = sel.parts ? new Set(sel.parts.map((p) => PART_ID[p])) : null;
    const mats = sel.materials ? new Set(sel.materials.map((m) => MATERIAL_ID[m])) : null;
    const out = [];
    for (let i = 0; i < this.count; i++) {
      if (parts && !parts.has(this.partId[i])) continue;
      if (mats && !mats.has(this.material[i])) continue;
      out.push(i);
    }
    hit = Uint32Array.from(out);
    this._selectCache.set(key, hit);
    return hit;
  }

  partName(id) {
    return PARTS[id];
  }

  materialName(id) {
    return MATERIALS[id - 1]?.name;
  }
}
