// Struct-of-arrays voxel storage (DESIGN.md §4.4). Base buffers are read-only
// once built; effects write to the EffectStack's work buffers instead.
// Parts, materials and named selectors come from the subject definition.

export const FLAG_INTERIOR = 1;
export const FLAG_SURFACE = 2;
export const FLAG_FRONT_FACE = 4;

/**
 * @typedef {Object} Material
 * @property {string} ch     key used by sprites and selectors
 * @property {string} [name]
 * @property {number|string} hex  sRGB colour
 */

/** @typedef {string | { parts?: string[], materials?: string[] }} Selector */

export class VoxelModel {
  /**
   * @param {number} count
   * @param {{ materials: Material[], partNames: string[], selectors?: Record<string, Selector> }} meta
   */
  constructor(count, { materials, partNames, selectors = {} }) {
    this.count = count;
    this.surfaceCount = count; // voxels [0, surfaceCount) are surface; the rest are interior
    this.basePos = new Float32Array(count * 3);
    this.baseColour = new Float32Array(count * 3);
    this.material = new Uint8Array(count); // material index + 1 (0 = none)
    this.partId = new Uint8Array(count);
    this.flags = new Uint8Array(count);
    this.rand = new Float32Array(count);
    this.materials = materials;
    this.materialId = Object.fromEntries(materials.map((m, i) => [m.ch, i + 1]));
    this.partNames = partNames;
    this.partIdOf = Object.fromEntries(partNames.map((p, i) => [p, i]));
    /** @type {Record<string, { pivot: number[], axis: number[] }>} */
    this.parts = Object.fromEntries(partNames.map((p) => [p, { pivot: [0, 0, 0], axis: [0, 1, 0] }]));
    /** @type {Record<string, Selector>} */
    this.selectors = { all: {}, ...selectors };
    this.bounds = { min: [0, 0, 0], max: [0, 0, 0], centre: [0, 0, 0] };
    this._selectCache = new Map();
    this._warned = new Set();
    /** @type {number[][] | null} */
    this._pivotList = null;
  }

  /** Pivots indexed by part id (for tight loops). */
  get pivotList() {
    return (this._pivotList ??= this.partNames.map((p) => this.parts[p].pivot));
  }

  /**
   * Index list for a selector: a named selector, 'part:NAME', 'material:ch',
   * or { parts?, materials? }. Unknown names select nothing (with one warning).
   * @param {Selector} [selector]
   * @returns {Uint32Array}
   */
  select(selector = 'all') {
    const key = typeof selector === 'string' ? selector : JSON.stringify(selector);
    let hit = this._selectCache.get(key);
    if (hit) return hit;
    let sel;
    if (typeof selector !== 'string') sel = selector;
    else if (selector.startsWith('part:')) sel = { parts: [selector.slice(5)] };
    else if (selector.startsWith('material:')) sel = { materials: [selector.slice(9)] };
    else sel = this.selectors[selector];
    if (typeof sel === 'string') sel = this.selectors[sel];
    if (!sel) {
      if (!this._warned.has(key)) {
        this._warned.add(key);
        console.warn(`[voxel-scene] unknown selector "${key}"; known: ${Object.keys(this.selectors).join(', ')}`);
      }
      hit = new Uint32Array(0);
      this._selectCache.set(key, hit);
      return hit;
    }
    const parts = sel.parts ? new Set(sel.parts.map((p) => this.partIdOf[p])) : null;
    const mats = sel.materials ? new Set(sel.materials.map((m) => this.materialId[m])) : null;
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

  /** Names usable as an effect `selector`. */
  get selectorNames() {
    return [...Object.keys(this.selectors), ...this.partNames.map((p) => `part:${p}`)];
  }
}
