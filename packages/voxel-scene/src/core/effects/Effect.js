// Effect contract (DESIGN.md §6.1).
//
// Subclass (or use defineEffect), set the static `type`, `schema`, `defaults`
// and `defaultEnvelope`, and implement apply(). The schema drives the debug
// panel and JSON presets, so a new effect needs no other wiring.
//
// Schema entry: { key, type: 'number'|'colour'|'select'|'bool'|'vec3', min, max, step, options, label }

import { Envelope, mergeEnvelope } from '../Envelope.js';

let nextId = 1;

/**
 * @typedef {Object} SchemaEntry
 * @property {string} key
 * @property {'number'|'colour'|'select'|'bool'|'vec3'} type
 * @property {number} [min]
 * @property {number} [max]
 * @property {number} [step]
 * @property {string[]} [options]
 * @property {string} [label]
 *
 * @typedef {Object} WorkBuffers
 * @property {Float32Array} offset  N*3 additive translation (before offset strength)
 * @property {Float32Array} scale   N*3 multiplicative, starts at 1
 * @property {Float32Array} colour  N*3 linear RGB, starts at base colour
 * @property {Float32Array} alpha   N, 0 hides the voxel
 *
 * @typedef {Object} EffectSpec
 * @property {string} [id]           stable key for diffing (default `${type}-${index}`)
 * @property {string | typeof Effect} type  registry name or an Effect subclass
 * @property {string} [name]
 * @property {boolean} [enabled]
 * @property {number} [strength]
 * @property {number} [offsetStrength]
 * @property {import('../model/VoxelModel.js').Selector} [selector]
 * @property {'add'|'set'} [offsetMode]
 * @property {'multiply'|'add'|'set'} [scaleMode]
 * @property {Record<string, any>} [params]
 * @property {Partial<import('../Envelope.js').EnvelopeSpec>} [envelope]
 */

export class Effect {
  static type = 'Effect';
  /** @type {SchemaEntry[]} */
  static schema = [];
  /** @type {Record<string, any>} */
  static defaults = {};
  /** @type {Partial<import('../Envelope.js').EnvelopeSpec>} */
  static defaultEnvelope = {};
  /** @type {import('../model/VoxelModel.js').Selector} */
  static defaultSelector = 'all';
  static needsInterior = false;

  /** @param {Omit<EffectSpec, 'type'>} [spec] */
  constructor({ id, name, enabled = true, strength = 1, offsetStrength = 1, selector, envelope = {}, params = {}, offsetMode = 'add', scaleMode = 'multiply' } = {}) {
    const C = /** @type {typeof Effect} */ (this.constructor);
    this.id = id || `${C.type}-${nextId++}`;
    this.name = name || C.type;
    this.enabled = enabled;
    this.strength = strength;
    this.offsetStrength = offsetStrength;
    this.selector = selector || C.defaultSelector;
    this.offsetMode = offsetMode;
    this.scaleMode = scaleMode;
    /** @type {Record<string, any>} */
    this.params = structuredClone({ ...C.defaults, ...params });
    this.envelope = new Envelope(mergeEnvelope(structuredClone(C.defaultEnvelope), envelope));
    /** Hash of the spec this instance was last patched from (see reconcile.js). */
    this.specKey = '';
  }

  get needsInterior() {
    return /** @type {typeof Effect} */ (this.constructor).needsInterior;
  }

  /**
   * @param {WorkBuffers} work
   * @param {import('../model/VoxelModel.js').VoxelModel} model
   * @param {Uint32Array} indices  voxels selected by this.selector
   * @param {import('../Clock.js').FrameCtx} ctx
   * @param {Envelope} env  call env.value(i) per voxel
   */
  // eslint-disable-next-line no-unused-vars
  apply(work, model, indices, ctx, env) {}

  // Channel writers that honour the blend modes (DESIGN.md §5.2).
  writeOffset(work, i, x, y, z) {
    const o = work.offset, j = i * 3, k = this.offsetStrength;
    if (this.offsetMode === 'set') {
      o[j] = x * k; o[j + 1] = y * k; o[j + 2] = z * k;
    } else {
      o[j] += x * k; o[j + 1] += y * k; o[j + 2] += z * k;
    }
  }

  /** Factors are multiplicative (1 = unchanged). */
  writeScale(work, i, fx, fy, fz) {
    const s = work.scale, j = i * 3;
    if (this.scaleMode === 'set') {
      s[j] = fx; s[j + 1] = fy; s[j + 2] = fz;
    } else if (this.scaleMode === 'add') {
      s[j] += fx - 1; s[j + 1] += fy - 1; s[j + 2] += fz - 1;
    } else {
      s[j] *= fx; s[j + 1] *= fy; s[j + 2] *= fz;
    }
  }

  /** @returns {EffectSpec} */
  toJSON() {
    return {
      type: /** @type {typeof Effect} */ (this.constructor).type,
      id: this.id,
      name: this.name,
      enabled: this.enabled,
      strength: this.strength,
      offsetStrength: this.offsetStrength,
      selector: this.selector,
      offsetMode: this.offsetMode,
      scaleMode: this.scaleMode,
      params: structuredClone(this.params),
      envelope: structuredClone(this.envelope.spec),
    };
  }
}

/**
 * Build an Effect subclass from a plain object, for quick one-offs.
 * `apply` runs with `this` bound to the effect instance.
 * @param {{
 *   type: string, apply: Effect['apply'], schema?: SchemaEntry[], defaults?: Record<string, any>,
 *   defaultEnvelope?: Partial<import('../Envelope.js').EnvelopeSpec>,
 *   defaultSelector?: import('../model/VoxelModel.js').Selector, needsInterior?: boolean,
 * }} def
 * @returns {typeof Effect}
 */
export function defineEffect({ type, apply, schema = [], defaults = {}, defaultEnvelope = {}, defaultSelector = 'all', needsInterior = false }) {
  const C = class extends Effect {};
  Object.assign(C, { type, schema, defaults, defaultEnvelope, defaultSelector, needsInterior });
  C.prototype.apply = apply;
  return C;
}
